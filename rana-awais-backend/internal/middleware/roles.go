package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v4"
)

type Role string

const (
	RoleAdmin   Role = "admin"
	RoleManager Role = "manager"
	RoleStaff   Role = "staff"
)

// ============================================================
// ROLE MIDDLEWARES
// ============================================================

// AdminOnly ensures the user has "admin" role only
func AdminOnly(next http.Handler) http.Handler {
	return requireRole(string(RoleAdmin))(next)
}

// ManagerOrAdmin ensures the user has "manager" or "admin" role
func ManagerOrAdmin(next http.Handler) http.Handler {
	return requireRole(string(RoleAdmin), string(RoleManager))(next)
}

// StaffOrAbove ensures the user has "staff", "manager", or "admin" role
func StaffOrAbove(next http.Handler) http.Handler {
	return requireRole(string(RoleAdmin), string(RoleManager), string(RoleStaff))(next)
}

// ============================================================
// PERMISSION CHECKS
// ============================================================

// CanDelete checks if user can delete records (only admin)
func CanDelete(r *http.Request) bool {
	role := GetUserRole(r)
	return role == string(RoleAdmin)
}

// CanManageUsers checks if user can manage users (only admin)
func CanManageUsers(r *http.Request) bool {
	role := GetUserRole(r)
	return role == string(RoleAdmin)
}

// CanAccessSettings checks if user can access settings (only admin)
func CanAccessSettings(r *http.Request) bool {
	role := GetUserRole(r)
	return role == string(RoleAdmin)
}

// CanManageCustomers checks if user can add/edit customers (admin or manager)
func CanManageCustomers(r *http.Request) bool {
	role := GetUserRole(r)
	return role == string(RoleAdmin) || role == string(RoleManager)
}

// CanCreatePlans checks if user can create installment plans (admin, manager, or staff)
func CanCreatePlans(r *http.Request) bool {
	role := GetUserRole(r)
	return role == string(RoleAdmin) || role == string(RoleManager) || role == string(RoleStaff)
}

// CanMakePayments checks if user can record payments (admin, manager, or staff)
func CanMakePayments(r *http.Request) bool {
	role := GetUserRole(r)
	return role == string(RoleAdmin) || role == string(RoleManager) || role == string(RoleStaff)
}

// CanViewReports checks if user can view reports (admin or manager)
func CanViewReports(r *http.Request) bool {
	role := GetUserRole(r)
	return role == string(RoleAdmin) || role == string(RoleManager)
}

// CanViewCustomers checks if user can view customer list (all roles)
func CanViewCustomers(r *http.Request) bool {
	role := GetUserRole(r)
	return role == string(RoleAdmin) || role == string(RoleManager) || role == string(RoleStaff)
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// requireRole returns a middleware that checks for specific roles
func requireRole(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := r.Context().Value(UserContextKey).(jwt.MapClaims)
			if !ok {
				respondForbidden(w)
				return
			}

			role, ok := claims["role"].(string)
			if !ok {
				respondForbidden(w)
				return
			}

			for _, allowed := range roles {
				if role == allowed {
					next.ServeHTTP(w, r)
					return
				}
			}

			respondForbidden(w)
		})
	}
}

// GetUserIDFromContext extracts user ID from context
func GetUserIDFromContext(ctx context.Context) string {
	if claims, ok := ctx.Value(UserContextKey).(jwt.MapClaims); ok {
		if sub, ok := claims["sub"].(string); ok {
			return sub
		}
	}
	return ""
}

// GetUserRoleFromContext extracts user role from context
func GetUserRoleFromContext(ctx context.Context) string {
	if claims, ok := ctx.Value(UserContextKey).(jwt.MapClaims); ok {
		if role, ok := claims["role"].(string); ok {
			return strings.ToLower(role)
		}
	}
	return ""
}

// GetUserID is a public helper to extract user ID from request context
func GetUserID(r *http.Request) string {
	return GetUserIDFromContext(r.Context())
}

// GetUserRole returns the role from request context
func GetUserRole(r *http.Request) string {
	return GetUserRoleFromContext(r.Context())
}

// ============================================================
// RESPONSE HELPERS
// ============================================================

func respondForbidden(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusForbidden)
	w.Write([]byte(`{"error":"forbidden","error_ur":"غیر مجاز رسائی"}`))
}
