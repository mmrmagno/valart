package main

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

func art(width, height int, filledAt int) string {
	lines := make([]string, height)
	for r := range lines {
		row := []rune(strings.Repeat(string(empty), width))
		if r == 0 {
			row[filledAt] = filled
		}
		lines[r] = string(row)
	}
	return strings.Join(lines, "\n")
}

func validSub() Submission {
	return Submission{Name: "Jett dash", Author: "José O'Neil", Art: art(26, 3, 4), Width: 26, Height: 3, TurnstileToken: "tok"}
}

func TestValidateAcceptsAndRejects(t *testing.T) {
	ok := validSub()
	if err := ok.Validate(); err != nil {
		t.Fatalf("valid submission rejected: %v", err)
	}
	cases := map[string]func(*Submission){
		"empty name":     func(s *Submission) { s.Name = "  " },
		"long name":      func(s *Submission) { s.Name = strings.Repeat("a", 61) },
		"html in name":   func(s *Submission) { s.Name = "<b>x</b>" },
		"mention":        func(s *Submission) { s.Author = "@everyone" },
		"link":           func(s *Submission) { s.Author = "http://evil" },
		"bad width":      func(s *Submission) { s.Width = 30; s.Art = art(30, 3, 1) },
		"bad height":     func(s *Submission) { s.Height = 14; s.Art = art(26, 14, 1) },
		"line count":     func(s *Submission) { s.Height = 4 },
		"ragged line":    func(s *Submission) { s.Art = strings.Replace(s.Art, string(empty), "", 1) },
		"foreign char":   func(s *Submission) { s.Art = strings.Replace(s.Art, string(empty), "<", 1) },
		"tab":            func(s *Submission) { s.Art = strings.Replace(s.Art, string(empty), "\t", 1) },
		"emoji":          func(s *Submission) { s.Art = strings.Replace(s.Art, string(empty), "🙂", 1) },
		"backtick":       func(s *Submission) { s.Art = strings.Replace(s.Art, string(empty), "`", 1) },
		"accent":         func(s *Submission) { s.Art = strings.Replace(s.Art, string(empty), "é", 1) },
		"at sign":        func(s *Submission) { s.Art = strings.Replace(s.Art, string(empty), "@", 1) },
		"blank art":      func(s *Submission) { s.Art = strings.ReplaceAll(s.Art, string(filled), string(empty)) },
		"one char only":  func(s *Submission) { s.Art = strings.ReplaceAll(s.Art, string(empty), string(filled)) },
		"markdown fence": func(s *Submission) { s.Name = "```" },
	}
	for name, mutate := range cases {
		s := validSub()
		mutate(&s)
		if err := s.Validate(); err == nil {
			t.Errorf("%s: accepted", name)
		}
	}
}

func TestValidateAcceptsGalleryCharacters(t *testing.T) {
	rows := []string{
		"▒▒▒▐███▀▀▀▀▀██▀▀▀▀▀███▌▒▒▒",
		"║──■─■─■──────▝███▄█▌──▀█▐",
		"╚══▀═▀═▀════════════▀▘═══╝",
		"──▜███▛──▗▙▟▖▚▞─╔╗▓▓░░────",
		"│┤╡╢╖╕╣╜╛┐└┴┬├┼╞╟╩╦╠╬╧╨╤╥╙",
		"╘╒╓╫╪┘┌──GG──ez──Valorant9",
		"──────────────────────────",
	}
	s := validSub()
	s.Height = len(rows)
	s.Art = strings.Join(rows, "\n")
	if err := s.Validate(); err != nil {
		t.Fatalf("gallery characters rejected: %v", err)
	}
}

func TestPaletteMatchesSite(t *testing.T) {
	raw, err := os.ReadFile("../src/lib/palette.json")
	if err != nil {
		t.Fatal(err)
	}
	var groups []struct{ Chars string }
	if err := json.Unmarshal(raw, &groups); err != nil {
		t.Fatal(err)
	}
	var site strings.Builder
	for _, g := range groups {
		site.WriteString(g.Chars)
	}
	if site.String() != palette {
		t.Fatalf("palette drift:\nsite %s\ngo   %s", site.String(), palette)
	}
}

func TestSlugify(t *testing.T) {
	for in, want := range map[string]string{
		"Jett dash":              "jett-dash",
		"Ñoño çà":                "nono-ca",
		"___":                    "art",
		strings.Repeat("ab", 40): strings.Repeat("ab", 20),
	} {
		if got := slugify(in); got != want {
			t.Errorf("slugify(%q) = %q, want %q", in, got, want)
		}
	}
}

type fakeGitHub struct {
	t        *testing.T
	pub      *rsa.PublicKey
	mu       sync.Mutex
	tokens   int
	calls    []string
	file     galleryFile
	prTitle  string
	prBody   string
	branch   string
	failPull bool
	deleted  []string
	tsDown   bool
}

func (f *fakeGitHub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls = append(f.calls, r.Method+" "+r.URL.Path)
	auth := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	body, _ := io.ReadAll(r.Body)
	switch {
	case r.Method == http.MethodPost && r.URL.Path == "/app/installations/99/access_tokens":
		parts := strings.Split(auth, ".")
		if len(parts) != 3 {
			http.Error(w, "bad jwt", http.StatusUnauthorized)
			return
		}
		sum := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
		sig, _ := base64.RawURLEncoding.DecodeString(parts[2])
		if err := rsa.VerifyPKCS1v15(f.pub, crypto.SHA256, sum[:], sig); err != nil {
			http.Error(w, "bad signature", http.StatusUnauthorized)
			return
		}
		claims, _ := base64.RawURLEncoding.DecodeString(parts[1])
		if !strings.Contains(string(claims), `"iss":"123"`) {
			http.Error(w, "bad issuer", http.StatusUnauthorized)
			return
		}
		var scope struct {
			Repositories []string          `json:"repositories"`
			Permissions  map[string]string `json:"permissions"`
		}
		_ = json.Unmarshal(body, &scope)
		if len(scope.Repositories) != 1 || scope.Repositories[0] != "r" || len(scope.Permissions) != 2 ||
			scope.Permissions["contents"] != "write" || scope.Permissions["pull_requests"] != "write" {
			http.Error(w, "token not scoped", http.StatusUnprocessableEntity)
			return
		}
		f.tokens++
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(map[string]any{"token": "inst-token", "expires_at": time.Now().Add(time.Hour)})
	case auth != "inst-token":
		http.Error(w, "unauthorized", http.StatusUnauthorized)
	case r.Method == http.MethodGet && r.URL.Path == "/repos/o/r/git/ref/heads/main":
		_ = json.NewEncoder(w).Encode(map[string]any{"object": map[string]string{"sha": "abc123"}})
	case r.Method == http.MethodPost && r.URL.Path == "/repos/o/r/git/refs":
		var in map[string]string
		_ = json.Unmarshal(body, &in)
		if in["sha"] != "abc123" || !strings.HasPrefix(in["ref"], "refs/heads/submission/") {
			http.Error(w, "bad ref", http.StatusUnprocessableEntity)
			return
		}
		f.branch = strings.TrimPrefix(in["ref"], "refs/heads/")
		w.WriteHeader(http.StatusCreated)
	case r.Method == http.MethodPut && strings.HasPrefix(r.URL.Path, "/repos/o/r/contents/src/content/gallery/"):
		var in map[string]string
		_ = json.Unmarshal(body, &in)
		raw, _ := base64.StdEncoding.DecodeString(in["content"])
		_ = json.Unmarshal(raw, &f.file)
		if in["branch"] != f.branch {
			http.Error(w, "wrong branch", http.StatusUnprocessableEntity)
			return
		}
		w.WriteHeader(http.StatusCreated)
	case r.Method == http.MethodDelete && strings.HasPrefix(r.URL.Path, "/repos/o/r/git/refs/heads/submission/"):
		f.deleted = append(f.deleted, strings.TrimPrefix(r.URL.Path, "/repos/o/r/git/refs/heads/"))
		w.WriteHeader(http.StatusNoContent)
	case r.Method == http.MethodPost && r.URL.Path == "/repos/o/r/pulls":
		if f.failPull {
			http.Error(w, "boom", http.StatusInternalServerError)
			return
		}
		var in map[string]string
		_ = json.Unmarshal(body, &in)
		f.prTitle, f.prBody = in["title"], in["body"]
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(map[string]string{"html_url": "https://github.com/o/r/pull/7"})
	default:
		http.Error(w, "unexpected "+r.Method+" "+r.URL.Path, http.StatusTeapot)
	}
}

type fakeTurnstile struct {
	mu          sync.Mutex
	calls       int
	ok          bool
	wrongAction bool
}

func (f *fakeTurnstile) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls++
	_ = r.ParseForm()
	success := f.ok && r.PostForm.Get("secret") == "ts-secret" && r.PostForm.Get("response") == "tok"
	action := "submit"
	if f.wrongAction {
		action = "other"
	}
	_ = json.NewEncoder(w).Encode(map[string]any{"success": success, "hostname": "val.marc-os.com", "action": action})
}

func newTestServer(t *testing.T) (*httptest.Server, *fakeGitHub, *fakeTurnstile) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	pemKey := pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(key)})
	parsed, err := ParsePrivateKey(pemKey)
	if err != nil {
		t.Fatal(err)
	}
	gh := &fakeGitHub{t: t, pub: &key.PublicKey}
	ghSrv := httptest.NewServer(gh)
	t.Cleanup(ghSrv.Close)
	ts := &fakeTurnstile{ok: true}
	tsSrv := httptest.NewServer(ts)
	t.Cleanup(tsSrv.Close)

	s := &server{
		github:    &GitHub{API: ghSrv.URL, AppID: "123", InstallationID: "99", Repo: "o/r", Base: "main", Key: parsed, Client: ghSrv.Client(), Now: time.Now},
		turnstile: &Turnstile{URL: tsSrv.URL, Secret: "ts-secret", Hostname: "val.marc-os.com", Action: "submit", Client: tsSrv.Client()},
		limit:     newLimiter(2, 100, 1000, time.Hour),
		attempts:  newLimiter(50, 1000, 10000, time.Hour),
		origin:    "https://val.marc-os.com",
		slots:     make(chan struct{}, 4),
		verifying: make(chan struct{}, 8),
	}
	api := httptest.NewServer(s.handler())
	t.Cleanup(api.Close)
	return api, gh, ts
}

func post(t *testing.T, api *httptest.Server, body string, ip string) (int, map[string]any) {
	t.Helper()
	req, _ := http.NewRequest(http.MethodPost, api.URL+"/api/submit", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", "https://val.marc-os.com")
	if ip != "" {
		req.Header.Set("Cf-Connecting-Ip", ip)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	var out map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&out)
	return resp.StatusCode, out
}

func encode(s Submission) string {
	b, _ := json.Marshal(s)
	return string(b)
}

func TestSubmitOpensAPullRequest(t *testing.T) {
	api, gh, _ := newTestServer(t)
	code, out := post(t, api, encode(validSub()), "203.0.113.1")
	if code != http.StatusOK || out["pr"] != "https://github.com/o/r/pull/7" {
		t.Fatalf("submit = %d %v", code, out)
	}
	if gh.file.Name != "Jett dash" || gh.file.Author != "José O'Neil" || gh.file.GridSize.Width != 26 || gh.file.GridSize.Height != 3 {
		t.Errorf("gallery file = %+v", gh.file)
	}
	if !strings.HasPrefix(gh.branch, "submission/jett-dash-") {
		t.Errorf("branch = %q", gh.branch)
	}
	if gh.prTitle != `New art: "Jett dash" by "José O'Neil"` || !strings.Contains(gh.prBody, validSub().Art) {
		t.Errorf("pr title %q body %q", gh.prTitle, gh.prBody)
	}
	if _, err := time.Parse(time.RFC3339, gh.file.SubmittedAt); err != nil {
		t.Errorf("submittedAt %q: %v", gh.file.SubmittedAt, err)
	}

	second := validSub()
	second.Art = art(26, 3, 9)
	code, _ = post(t, api, encode(second), "203.0.113.2")
	if code != http.StatusOK {
		t.Fatalf("second submit = %d", code)
	}
	if code, _ := post(t, api, encode(second), "203.0.113.3"); code != http.StatusConflict {
		t.Fatalf("duplicate art = %d, want 409", code)
	}
	if gh.tokens != 1 {
		t.Errorf("installation token fetched %d times, want it cached", gh.tokens)
	}
}

func TestInvalidInputNeverReachesGitHubOrTurnstile(t *testing.T) {
	api, gh, ts := newTestServer(t)
	bad := validSub()
	bad.Art = strings.Replace(bad.Art, string(empty), "<", 1)
	for _, body := range []string{encode(bad), `not json`, `{"name":"a","extra":1}`, encode(Submission{})} {
		if code, _ := post(t, api, body, "203.0.113.9"); code != http.StatusBadRequest {
			t.Errorf("body %.40q got %d, want 400", body, code)
		}
	}
	if len(gh.calls) != 0 || ts.calls != 0 {
		t.Fatalf("invalid input reached github %v / turnstile %d", gh.calls, ts.calls)
	}
}

func TestFailedCaptchaNeverReachesGitHub(t *testing.T) {
	api, gh, ts := newTestServer(t)
	ts.ok = false
	if code, _ := post(t, api, encode(validSub()), "203.0.113.3"); code != http.StatusForbidden {
		t.Fatalf("got %d, want 403", code)
	}
	if len(gh.calls) != 0 {
		t.Fatalf("github called after a failed captcha: %v", gh.calls)
	}
}

func TestRateLimitPerClient(t *testing.T) {
	api, _, _ := newTestServer(t)
	sub := func(col int) string { s := validSub(); s.Art = art(26, 3, col); return encode(s) }
	for i := 0; i < 2; i++ {
		if code, _ := post(t, api, sub(i), "198.51.100.5"); code != http.StatusOK {
			t.Fatalf("submit %d = %d", i, code)
		}
	}
	if code, _ := post(t, api, sub(5), "198.51.100.5"); code != http.StatusTooManyRequests {
		t.Fatalf("third submit = %d, want 429", code)
	}
	if code, _ := post(t, api, sub(6), "198.51.100.6"); code != http.StatusOK {
		t.Fatalf("other client = %d, want 200", code)
	}
}

func TestGitHubFailureIsAGenericError(t *testing.T) {
	api, gh, _ := newTestServer(t)
	gh.failPull = true
	code, out := post(t, api, encode(validSub()), "203.0.113.4")
	if code != http.StatusBadGateway || strings.Contains(out["error"].(string), "boom") {
		t.Fatalf("got %d %v", code, out)
	}
	if len(gh.deleted) != 1 || gh.deleted[0] != gh.branch {
		t.Fatalf("orphan branch not cleaned up: deleted %v, branch %q", gh.deleted, gh.branch)
	}
	gh.failPull = false
	if code, _ := post(t, api, encode(validSub()), "203.0.113.4"); code != http.StatusOK {
		t.Fatalf("retry after a GitHub failure = %d, want 200 (failed attempts must not count as duplicates)", code)
	}
}

func TestTurnstileOutageIsNotACaptchaFailure(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "<html>down</html>", http.StatusBadGateway)
	}))
	defer ts.Close()
	tv := &Turnstile{URL: ts.URL, Secret: "s", Client: ts.Client()}
	err := tv.Verify(context.Background(), "tok", "")
	if err == nil || errors.Is(err, errCaptcha) {
		t.Fatalf("outage reported as %v", err)
	}
}

func TestClientIPKeys(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/api/submit", nil)
	for raw, want := range map[string]string{
		"203.0.113.7":                  "203.0.113.7",
		"::ffff:203.0.113.7":           "203.0.113.7",
		"2001:db8:1:2:aaaa::1":         "2001:db8:1:2::/64",
		"2001:0db8:0001:0002:bbbb::99": "2001:db8:1:2::/64",
	} {
		r.Header.Set("Cf-Connecting-Ip", raw)
		if got := clientIP(r); got != want {
			t.Errorf("clientIP(%q) = %q, want %q", raw, got, want)
		}
	}
}

func TestLimiterForgetsRejectedStrangers(t *testing.T) {
	l := newLimiter(5, 1, 1000, time.Hour)
	l.allow("first")
	for i := 0; i < 5000; i++ {
		l.allow(fmt.Sprintf("ip-%d", i))
	}
	if len(l.hits) > 2 {
		t.Fatalf("limiter kept %d entries for rejected clients", len(l.hits))
	}
}

func TestGlobalCap(t *testing.T) {
	l := newLimiter(5, 3, 1000, time.Hour)
	now := time.Now()
	l.now = func() time.Time { return now }
	for i, ip := range []string{"a", "b", "c"} {
		if !l.allow(ip) {
			t.Fatalf("hit %d refused", i)
		}
	}
	if l.allow("d") {
		t.Fatal("global cap not enforced")
	}
	now = now.Add(61 * time.Minute)
	if !l.allow("d") {
		t.Fatal("window did not slide")
	}
}

func TestOpenPRUsesContext(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	g := &GitHub{API: "http://127.0.0.1:1", AppID: "1", InstallationID: "1", Repo: "o/r", Base: "main", Client: http.DefaultClient, Now: time.Now}
	key, _ := rsa.GenerateKey(rand.Reader, 2048)
	g.Key = key
	if _, err := g.OpenPR(ctx, validSub()); err == nil {
		t.Fatal("cancelled context did not stop OpenPR")
	}
}

func TestForeignOriginRejected(t *testing.T) {
	api, gh, ts := newTestServer(t)
	for _, origin := range []string{"", "https://evil.example", "https://val.marc-os.com.evil.example", "null"} {
		req, _ := http.NewRequest(http.MethodPost, api.URL+"/api/submit", strings.NewReader(encode(validSub())))
		req.Header.Set("Content-Type", "application/json")
		if origin != "" {
			req.Header.Set("Origin", origin)
		}
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusForbidden {
			t.Errorf("origin %q got %d, want 403", origin, resp.StatusCode)
		}
	}
	if len(gh.calls) != 0 || ts.calls != 0 {
		t.Fatalf("foreign origin reached github %v / turnstile %d", gh.calls, ts.calls)
	}
}

func TestTurnstileActionMustMatch(t *testing.T) {
	api, gh, ts := newTestServer(t)
	ts.wrongAction = true
	if code, _ := post(t, api, encode(validSub()), "203.0.113.20"); code != http.StatusForbidden {
		t.Fatalf("token for another action got %d, want 403", code)
	}
	if len(gh.calls) != 0 {
		t.Fatal("github called with a token minted for another action")
	}
}

func TestDailyCap(t *testing.T) {
	l := newLimiter(100, 100, 3, time.Hour)
	now := time.Now()
	l.now = func() time.Time { return now }
	for i := 0; i < 3; i++ {
		now = now.Add(2 * time.Hour)
		if !l.allow(fmt.Sprintf("ip%d", i)) {
			t.Fatalf("hit %d refused", i)
		}
	}
	now = now.Add(2 * time.Hour)
	if l.allow("ip9") {
		t.Fatal("daily cap not enforced across hourly windows")
	}
}

func TestPRBodyNamesAreCode(t *testing.T) {
	api, gh, _ := newTestServer(t)
	s := validSub()
	s.Name = "www.evil.com"
	if code, _ := post(t, api, encode(s), "203.0.113.30"); code != http.StatusOK {
		t.Fatalf("submit = %d", code)
	}
	if !strings.Contains(gh.prBody, "`www.evil.com`") {
		t.Fatalf("name not rendered as inline code: %q", gh.prBody)
	}
}

func TestFailedAttemptsDoNotBurnTheQuota(t *testing.T) {
	api, gh, ts := newTestServer(t)
	ts.ok = false
	for i := 0; i < 10; i++ {
		post(t, api, encode(validSub()), "203.0.113.50")
	}
	ts.ok = true
	gh.failPull = true
	for i := 0; i < 5; i++ {
		post(t, api, encode(validSub()), "203.0.113.50")
	}
	gh.failPull = false
	if code, _ := post(t, api, encode(validSub()), "203.0.113.50"); code != http.StatusOK {
		t.Fatalf("after 15 failed attempts a real submission got %d, want 200", code)
	}
}

func TestAttemptLimiterRunsBeforeCaptcha(t *testing.T) {
	api, _, ts := newTestServer(t)
	ts.ok = false
	for i := 0; i < 60; i++ {
		post(t, api, encode(validSub()), "203.0.113.60")
	}
	if ts.calls > 50 {
		t.Fatalf("captcha verified %d times for one client, the attempt limit should stop it at 50", ts.calls)
	}
}

func TestConcurrentIdenticalArtOpensOnePR(t *testing.T) {
	api, gh, _ := newTestServer(t)
	var wg sync.WaitGroup
	codes := make(chan int, 6)
	for i := 0; i < 6; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			code, _ := post(t, api, encode(validSub()), fmt.Sprintf("198.51.100.%d", 100+i))
			codes <- code
		}(i)
	}
	wg.Wait()
	close(codes)
	ok := 0
	for c := range codes {
		if c == http.StatusOK {
			ok++
		}
	}
	gh.mu.Lock()
	defer gh.mu.Unlock()
	if ok != 1 {
		t.Fatalf("%d identical concurrent submissions succeeded, want exactly 1", ok)
	}
}
