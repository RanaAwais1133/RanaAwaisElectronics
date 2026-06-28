package middleware

import (
	"context"
	"net/http"
	"strings"
)

type contextKey string

const LangKey contextKey = "lang"

// LanguageMiddleware detects the user's language from query param (?lang=ur) or Accept-Language header.
// Default language is Urdu (ur) as per project requirement.
func LanguageMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		lang := "ur" // default Urdu

		// Check query parameter first
		if qLang := r.URL.Query().Get("lang"); qLang != "" {
			lang = strings.ToLower(qLang)
			if lang != "ur" && lang != "en" {
				lang = "ur"
			}
		} else if al := r.Header.Get("Accept-Language"); al != "" {
			if strings.HasPrefix(al, "ur") {
				lang = "ur"
			} else if strings.HasPrefix(al, "en") {
				lang = "en"
			}
		}

		ctx := context.WithValue(r.Context(), LangKey, lang)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetLang extracts the language from the request context (usable in handlers).
func GetLang(ctx context.Context) string {
	lang, _ := ctx.Value(LangKey).(string)
	if lang == "" {
		return "ur" // default Urdu
	}
	if lang != "ur" && lang != "en" {
		return "ur"
	}
	return lang
}

// GetLangFromRequest extracts language from request (helper)
func GetLangFromRequest(r *http.Request) string {
	return GetLang(r.Context())
}

// IsUrdu returns true if language is Urdu
func IsUrdu(ctx context.Context) bool {
	return GetLang(ctx) == "ur"
}

// IsEnglish returns true if language is English
func IsEnglish(ctx context.Context) bool {
	return GetLang(ctx) == "en"
}
