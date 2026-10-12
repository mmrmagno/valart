package main

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"
)

const (
	filled  = '█'
	empty   = '░'
	nameMax = 60
)

var (
	widths = map[int]bool{26: true, 27: true}
	// Latin script only (accents allowed): no homoglyph scripts, no invisible Hangul fillers, no RTL reordering.
	namePattern = regexp.MustCompile(`^[\p{Latin}\p{N} _'.-]+$`)
	hasAlnum    = regexp.MustCompile(`[\p{Latin}\p{N}]`)
	slugJunk    = regexp.MustCompile(`[^a-z0-9]+`)
)

type Submission struct {
	Name           string `json:"name"`
	Author         string `json:"author"`
	Art            string `json:"art"`
	Width          int    `json:"width"`
	Height         int    `json:"height"`
	TurnstileToken string `json:"turnstileToken"`
}

func validName(field, v string) error {
	if v == "" {
		return fmt.Errorf("%s is required", field)
	}
	if utf8.RuneCountInString(v) > nameMax {
		return fmt.Errorf("%s must be at most %d characters", field, nameMax)
	}
	if !namePattern.MatchString(v) || !hasAlnum.MatchString(v) {
		return fmt.Errorf("%s may only contain Latin letters, digits, spaces and _ ' . -", field)
	}
	return nil
}

func (s *Submission) Validate() error {
	s.Name = strings.TrimSpace(s.Name)
	s.Author = strings.TrimSpace(s.Author)
	if err := validName("name", s.Name); err != nil {
		return err
	}
	if err := validName("author", s.Author); err != nil {
		return err
	}
	if !widths[s.Width] {
		return errors.New("width must be 26 or 27")
	}
	if s.Height < 1 || s.Height > 13 {
		return errors.New("height must be between 1 and 13")
	}
	lines := strings.Split(s.Art, "\n")
	if len(lines) != s.Height {
		return fmt.Errorf("art must have %d lines", s.Height)
	}
	any := false
	for _, line := range lines {
		if utf8.RuneCountInString(line) != s.Width {
			return fmt.Errorf("every line must be %d cells wide", s.Width)
		}
		for _, r := range line {
			switch r {
			case filled:
				any = true
			case empty:
			default:
				return errors.New("art may only contain drawn and empty cells")
			}
		}
	}
	if !any {
		return errors.New("art is empty")
	}
	return nil
}

func slugify(v string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(v) {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case strings.ContainsRune("àáâãäå", r):
			b.WriteRune('a')
		case strings.ContainsRune("èéêë", r):
			b.WriteRune('e')
		case strings.ContainsRune("ìíîï", r):
			b.WriteRune('i')
		case strings.ContainsRune("òóôõö", r):
			b.WriteRune('o')
		case strings.ContainsRune("ùúûü", r):
			b.WriteRune('u')
		case r == 'ñ':
			b.WriteRune('n')
		case r == 'ç':
			b.WriteRune('c')
		default:
			b.WriteRune('-')
		}
	}
	s := strings.Trim(slugJunk.ReplaceAllString(b.String(), "-"), "-")
	if len(s) > 40 {
		s = strings.Trim(s[:40], "-")
	}
	if s == "" {
		s = "art"
	}
	return s
}
