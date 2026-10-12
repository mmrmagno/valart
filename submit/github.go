package main

import (
	"bytes"
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

type GitHub struct {
	API            string
	AppID          string
	InstallationID string
	Repo           string
	Base           string
	Key            *rsa.PrivateKey
	Client         *http.Client
	Now            func() time.Time

	mu      sync.Mutex
	token   string
	expires time.Time
}

func ParsePrivateKey(pemBytes []byte) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode(pemBytes)
	if block == nil {
		return nil, errors.New("github: private key is not PEM")
	}
	if key, err := x509.ParsePKCS1PrivateKey(block.Bytes); err == nil {
		return key, nil
	}
	parsed, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("github: parse private key: %w", err)
	}
	key, ok := parsed.(*rsa.PrivateKey)
	if !ok {
		return nil, errors.New("github: private key is not RSA")
	}
	return key, nil
}

func (g *GitHub) appJWT() (string, error) {
	now := g.Now()
	enc := base64.RawURLEncoding
	header := enc.EncodeToString([]byte(`{"alg":"RS256","typ":"JWT"}`))
	claims, err := json.Marshal(map[string]any{
		"iat": now.Add(-60 * time.Second).Unix(),
		"exp": now.Add(9 * time.Minute).Unix(),
		"iss": g.AppID,
	})
	if err != nil {
		return "", err
	}
	signing := header + "." + enc.EncodeToString(claims)
	sum := sha256.Sum256([]byte(signing))
	sig, err := rsa.SignPKCS1v15(rand.Reader, g.Key, crypto.SHA256, sum[:])
	if err != nil {
		return "", err
	}
	return signing + "." + enc.EncodeToString(sig), nil
}

func (g *GitHub) installationToken(ctx context.Context) (string, error) {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.token != "" && g.Now().Before(g.expires.Add(-5*time.Minute)) {
		return g.token, nil
	}
	jwt, err := g.appJWT()
	if err != nil {
		return "", err
	}
	var out struct {
		Token     string    `json:"token"`
		ExpiresAt time.Time `json:"expires_at"`
	}
	// Ask for the narrowest token possible: this one repository, contents and pull requests only, even if the
	// App were ever installed more widely or granted more.
	repoName := g.Repo[strings.LastIndex(g.Repo, "/")+1:]
	scope := map[string]any{
		"repositories": []string{repoName},
		"permissions":  map[string]string{"contents": "write", "pull_requests": "write"},
	}
	path := "/app/installations/" + g.InstallationID + "/access_tokens"
	if err := g.call(ctx, jwt, http.MethodPost, path, scope, &out, http.StatusCreated); err != nil {
		return "", err
	}
	if out.Token == "" {
		return "", errors.New("github: empty installation token")
	}
	g.token, g.expires = out.Token, out.ExpiresAt
	return g.token, nil
}

func (g *GitHub) call(ctx context.Context, bearer, method, path string, body, out any, want int) error {
	var reader io.Reader
	if body != nil {
		buf, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(buf)
	}
	req, err := http.NewRequestWithContext(ctx, method, g.API+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+bearer)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := g.Client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode != want {
		return fmt.Errorf("github %s %s: %d %s", method, path, resp.StatusCode, strings.TrimSpace(string(data)))
	}
	if out != nil {
		return json.Unmarshal(data, out)
	}
	return nil
}

type galleryFile struct {
	Name        string   `json:"name"`
	Author      string   `json:"author"`
	Art         string   `json:"art"`
	GridSize    gridSize `json:"gridSize"`
	SubmittedAt string   `json:"submittedAt"`
}

type gridSize struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

// OpenPR creates a branch from the base branch, adds the art as a gallery file and opens a pull request.
func (g *GitHub) OpenPR(ctx context.Context, s Submission) (string, error) {
	token, err := g.installationToken(ctx)
	if err != nil {
		return "", err
	}
	now := g.Now().UTC()
	suffix := make([]byte, 2)
	if _, err := rand.Read(suffix); err != nil {
		return "", err
	}
	id := slugify(s.Name) + "-" + strconv.FormatInt(now.Unix(), 10) + "-" + hex.EncodeToString(suffix)
	branch := "submission/" + id
	file := "src/content/gallery/" + id + ".json"

	var ref struct {
		Object struct {
			SHA string `json:"sha"`
		} `json:"object"`
	}
	if err := g.call(ctx, token, http.MethodGet, "/repos/"+g.Repo+"/git/ref/heads/"+g.Base, nil, &ref, http.StatusOK); err != nil {
		return "", err
	}
	if err := g.call(ctx, token, http.MethodPost, "/repos/"+g.Repo+"/git/refs",
		map[string]string{"ref": "refs/heads/" + branch, "sha": ref.Object.SHA}, nil, http.StatusCreated); err != nil {
		return "", err
	}
	opened := false
	defer func() {
		if !opened {
			_ = g.call(context.WithoutCancel(ctx), token, http.MethodDelete, "/repos/"+g.Repo+"/git/refs/heads/"+branch, nil, nil, http.StatusNoContent)
		}
	}()

	content, err := json.MarshalIndent(galleryFile{
		Name:        s.Name,
		Author:      s.Author,
		Art:         s.Art,
		GridSize:    gridSize{Width: s.Width, Height: s.Height},
		SubmittedAt: now.Format(time.RFC3339),
	}, "", "  ")
	if err != nil {
		return "", err
	}
	if err := g.call(ctx, token, http.MethodPut, "/repos/"+g.Repo+"/contents/"+file, map[string]string{
		"message": fmt.Sprintf("art: add %s by %s", s.Name, s.Author),
		"content": base64.StdEncoding.EncodeToString(append(content, '\n')),
		"branch":  branch,
	}, nil, http.StatusCreated); err != nil {
		return "", err
	}

	body := fmt.Sprintf("Submitted through val.marc-os.com.\n\n- Name: `%s`\n- Author: `%s`\n- Size: %dx%d\n\n```\n%s\n```\n\nMerge to publish, close to reject.",
		s.Name, s.Author, s.Width, s.Height, s.Art)
	var pr struct {
		HTMLURL string `json:"html_url"`
	}
	if err := g.call(ctx, token, http.MethodPost, "/repos/"+g.Repo+"/pulls", map[string]string{
		"title": fmt.Sprintf("New art: \"%s\" by \"%s\"", s.Name, s.Author),
		"head":  branch,
		"base":  g.Base,
		"body":  body,
	}, &pr, http.StatusCreated); err != nil {
		return "", err
	}
	opened = true
	return pr.HTMLURL, nil
}
