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
		} else if al := r.Header.Get("Accept-Language"); al != "" {
			if strings.HasPrefix(al, "ur") {
				lang = "ur"
			} else {
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
	return lang
}