package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Turnstile struct {
	URL      string
	Secret   string
	Hostname string
	Action   string
	Client   *http.Client
}

var errCaptcha = errors.New("captcha check failed, reload the page and try again")

func (t *Turnstile) Verify(ctx context.Context, token, remoteIP string) error {
	if token == "" || len(token) > 2048 {
		return errCaptcha
	}
	form := url.Values{"secret": {t.Secret}, "response": {token}}
	if remoteIP != "" {
		form.Set("remoteip", remoteIP)
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, t.URL, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := t.Client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("turnstile: siteverify returned %d", resp.StatusCode)
	}
	var out struct {
		Success  bool   `json:"success"`
		Hostname string `json:"hostname"`
		Action   string `json:"action"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(nil, resp.Body, 64<<10)).Decode(&out); err != nil {
		return err
	}
	if !out.Success || (t.Hostname != "" && out.Hostname != t.Hostname) || (t.Action != "" && out.Action != t.Action) {
		return errCaptcha
	}
	return nil
}
