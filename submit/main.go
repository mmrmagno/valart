package main

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"
)

type opener interface {
	OpenPR(ctx context.Context, s Submission) (string, error)
}

type verifier interface {
	Verify(ctx context.Context, token, remoteIP string) error
}

type limiter struct {
	mu     sync.Mutex
	perIP  int
	global int
	daily  int
	window time.Duration
	now    func() time.Time
	hits   map[string][]time.Time
	all    []time.Time
	day    []time.Time
	seen   map[[32]byte]time.Time
}

func newLimiter(perIP, global, daily int, window time.Duration) *limiter {
	return &limiter{perIP: perIP, global: global, daily: daily, window: window, now: time.Now,
		hits: map[string][]time.Time{}, seen: map[[32]byte]time.Time{}}
}

func (l *limiter) expireSeen(now time.Time) {
	for k, t := range l.seen {
		if now.Sub(t) > l.window {
			delete(l.seen, k)
		}
	}
}

// reserveArt atomically claims art for the window. It fails if the same art was submitted or is in flight.
func (l *limiter) reserveArt(art string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.expireSeen(l.now())
	key := sha256.Sum256([]byte(art))
	if _, ok := l.seen[key]; ok {
		return false
	}
	l.seen[key] = l.now()
	return true
}

// releaseArt frees a reservation after a failed attempt, so it can be retried.
func (l *limiter) releaseArt(art string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.seen, sha256.Sum256([]byte(art)))
}

func prune(ts []time.Time, cutoff time.Time) []time.Time {
	i := 0
	for i < len(ts) && ts[i].Before(cutoff) {
		i++
	}
	return ts[i:]
}

func (l *limiter) sweep(now time.Time) {
	cutoff := now.Add(-l.window)
	l.all = prune(l.all, cutoff)
	l.day = prune(l.day, now.Add(-24*time.Hour))
	if len(l.hits) > 1000 {
		for k, v := range l.hits {
			if len(prune(v, cutoff)) == 0 {
				delete(l.hits, k)
			}
		}
	}
}

// check reports whether ip may open another PR, without charging the quota.
func (l *limiter) check(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	l.sweep(now)
	mine := prune(l.hits[ip], now.Add(-l.window))
	if len(mine) == 0 {
		delete(l.hits, ip)
	} else {
		l.hits[ip] = mine
	}
	return len(mine) < l.perIP && len(l.all) < l.global && len(l.day) < l.daily
}

// charge records a PR that was actually opened. Failed and refused attempts never use up the quota.
func (l *limiter) charge(ip string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	l.hits[ip] = append(l.hits[ip], now)
	l.all = append(l.all, now)
	l.day = append(l.day, now)
}

// allow is check + charge, kept for callers that do both at once.
func (l *limiter) allow(ip string) bool {
	if !l.check(ip) {
		return false
	}
	l.charge(ip)
	return true
}

type server struct {
	github    opener
	turnstile verifier
	limit     *limiter
	attempts  *limiter
	origin    string
	slots     chan struct{}
	verifying chan struct{}
}

// clientIP is the rate limit key. Cf-Connecting-Ip is trusted because only cloudflared can reach this
// service (NetworkPolicy). IPv6 clients are grouped per /64, the smallest block an ISP hands out.
func clientIP(r *http.Request) string {
	raw := strings.TrimSpace(r.Header.Get("Cf-Connecting-Ip"))
	if raw == "" {
		host, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			host = r.RemoteAddr
		}
		raw = host
	}
	ip := net.ParseIP(raw)
	if ip == nil {
		return raw
	}
	if v4 := ip.To4(); v4 != nil {
		return v4.String()
	}
	return ip.Mask(net.CIDRMask(64, 128)).String() + "/64"
}

func remoteIP(r *http.Request) string {
	if raw := strings.TrimSpace(r.Header.Get("Cf-Connecting-Ip")); net.ParseIP(raw) != nil {
		return net.ParseIP(raw).String()
	}
	return ""
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func fail(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func (s *server) submit(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("Origin") != s.origin {
		fail(w, http.StatusForbidden, "submissions are only accepted from the site")
		return
	}
	if !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
		fail(w, http.StatusUnsupportedMediaType, "expected JSON")
		return
	}
	var sub Submission
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&sub); err != nil {
		fail(w, http.StatusBadRequest, "invalid request")
		return
	}
	if err := sub.Validate(); err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	ip := clientIP(r)
	if !s.attempts.allow(ip) {
		fail(w, http.StatusTooManyRequests, "too many attempts, try again later")
		return
	}
	if !s.limit.check(ip) {
		fail(w, http.StatusTooManyRequests, "too many submissions, try again later")
		return
	}
	select {
	case s.verifying <- struct{}{}:
	default:
		fail(w, http.StatusServiceUnavailable, "busy, try again in a minute")
		return
	}
	err := s.turnstile.Verify(r.Context(), sub.TurnstileToken, remoteIP(r))
	<-s.verifying
	if err != nil {
		if errors.Is(err, errCaptcha) {
			fail(w, http.StatusForbidden, err.Error())
		} else {
			log.Printf("turnstile: %v", err)
			fail(w, http.StatusServiceUnavailable, "captcha service unavailable, try again shortly")
		}
		return
	}
	if !s.limit.reserveArt(sub.Art) {
		fail(w, http.StatusConflict, "this exact art was just submitted")
		return
	}
	select {
	case s.slots <- struct{}{}:
		defer func() { <-s.slots }()
	default:
		s.limit.releaseArt(sub.Art)
		fail(w, http.StatusServiceUnavailable, "busy, try again in a minute")
		return
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), 30*time.Second)
	defer cancel()
	url, err := s.github.OpenPR(ctx, sub)
	if err != nil {
		s.limit.releaseArt(sub.Art)
		log.Printf("submit %q by %q: %v", sub.Name, sub.Author, err)
		fail(w, http.StatusBadGateway, "could not submit right now, try again later")
		return
	}
	s.limit.charge(ip)
	log.Printf("submitted %q by %q: %s", sub.Name, sub.Author, url)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "pr": url})
}

func (s *server) handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/submit", s.submit)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
	return mux
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func must(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("submit: %s is required", key)
	}
	return v
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	key, err := ParsePrivateKey([]byte(must("GITHUB_APP_PRIVATE_KEY")))
	if err != nil {
		log.Fatalf("submit: %v", err)
	}
	client := &http.Client{Timeout: 20 * time.Second}
	s := &server{
		github: &GitHub{
			API:            env("GITHUB_API", "https://api.github.com"),
			AppID:          must("GITHUB_APP_ID"),
			InstallationID: must("GITHUB_INSTALLATION_ID"),
			Repo:           env("GITHUB_REPO", "mmrmagno/valart"),
			Base:           env("GITHUB_BASE", "main"),
			Key:            key,
			Client:         client,
			Now:            time.Now,
		},
		turnstile: &Turnstile{
			URL:      env("TURNSTILE_URL", "https://challenges.cloudflare.com/turnstile/v0/siteverify"),
			Secret:   must("TURNSTILE_SECRET"),
			Hostname: env("TURNSTILE_HOSTNAME", "val.marc-os.com"),
			Action:   "submit",
			Client:   client,
		},
		limit:     newLimiter(5, 30, 100, time.Hour),
		attempts:  newLimiter(20, 600, 5000, time.Hour),
		origin:    env("ALLOWED_ORIGIN", "https://val.marc-os.com"),
		slots:     make(chan struct{}, 4),
		verifying: make(chan struct{}, 8),
	}

	srv := &http.Server{
		Addr:              env("LISTEN", ":8080"),
		Handler:           s.handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      45 * time.Second,
		MaxHeaderBytes:    16 << 10,
	}
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdown)
	}()
	log.Printf("submit: listening on %s", srv.Addr)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("submit: %v", err)
	}
}
