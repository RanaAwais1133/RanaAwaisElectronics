package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/audit"
)

type UserHandler struct {
	svc *service.UserService
}

func NewUserHandler(svc *service.UserService) *UserHandler {
	return &UserHandler{svc: svc}
}

type createUserRequest struct {
	Username      string `json:"username"`
	Password      string `json:"password"`
	Role          string `json:"role"`
	DisplayName   string `json:"displayName"`
	DisplayNameUr string `json:"displayNameUr"`
	Phone         string `json:"phone"`
}

func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}
	if req.Username == "" || req.Password == "" {
		respondError(w, r, http.StatusBadRequest, "Username and password required", "صارف نام اور پاسورڈ ضروری ہیں")
		return
	}
	if req.Role == "" {
		req.Role = "staff"
	}
	user := &domain.User{
		Username:      req.Username,
		Role:          req.Role,
		DisplayName:   req.DisplayName,
		DisplayNameUr: req.DisplayNameUr,
		Phone:         req.Phone,
	}
	if err := h.svc.Create(r.Context(), user, req.Password); err != nil {
		respondError(w, r, http.StatusConflict, err.Error(), "صارف نہیں بنایا جا سکا")
		return
	}
	audit.Log(r.Context(), "CREATE", "user", user.ID, "", getUserID(r))
	respondJSON(w, http.StatusCreated, user)
}

type changePasswordRequest struct {
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
}

func (h *UserHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	var req changePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}
	if req.OldPassword == "" || req.NewPassword == "" {
		respondError(w, r, http.StatusBadRequest, "Old and new password required", "پرانا اور نیا پاس ورڈ ضروری ہے")
		return
	}
	if len(req.NewPassword) < 4 {
		respondError(w, r, http.StatusBadRequest, "New password must be at least 4 characters", "نیا پاس ورڈ کم از کم 4 حروف کا ہو")
		return
	}

	userID := getUserID(r)
	if userID == "" {
		respondError(w, r, http.StatusUnauthorized, "Unauthorized", "غیر مجاز")
		return
	}

	if err := h.svc.ChangePassword(r.Context(), userID, req.OldPassword, req.NewPassword); err != nil {
		if err.Error() == "old password is incorrect" {
			respondError(w, r, http.StatusBadRequest, "Old password is incorrect", "پرانا پاس ورڈ غلط ہے")
			return
		}
		respondError(w, r, http.StatusInternalServerError, "Failed to change password", "پاس ورڈ تبدیل نہیں ہو سکا")
		return
	}
	audit.Log(r.Context(), "UPDATE", "user", userID, "Password changed", getUserID(r))
	respondJSON(w, http.StatusOK, map[string]string{"message": "Password changed successfully", "messageUr": "پاس ورڈ کامیابی سے تبدیل ہو گیا"})
}

func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
	skip, _ := strconv.ParseInt(r.URL.Query().Get("skip"), 10, 64)
	limit, _ := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)
	if limit == 0 { limit = 50 }
	users, err := h.svc.List(r.Context(), skip, limit)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to list", "فہرست نہیں لائی جا سکی")
		return
	}
	total, err := h.svc.Count(r.Context())
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to count", "گنتی نہیں ہو سکی")
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{"data": users, "total": total})
}

// Update updates a user (admin only)
func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		// Try to get from path
		id = r.PathValue("id")
	}
	if id == "" {
		respondError(w, r, http.StatusBadRequest, "User ID required", "صارف کی آئی ڈی ضروری ہے")
		return
	}

	var req struct {
		Username      string `json:"username"`
		Role          string `json:"role"`
		DisplayName   string `json:"displayName"`
		DisplayNameUr string `json:"displayNameUr"`
		Phone         string `json:"phone"`
		Password      string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}

	user := &domain.User{
		ID:            id,
		Username:      req.Username,
		Role:          req.Role,
		DisplayName:   req.DisplayName,
		DisplayNameUr: req.DisplayNameUr,
		Phone:         req.Phone,
	}

	if err := h.svc.Update(r.Context(), id, user); err != nil {
		respondError(w, r, http.StatusInternalServerError, err.Error(), "صارف اپ ڈیٹ نہیں ہو سکا")
		return
	}

	// If password is provided, update it separately
	if req.Password != "" {
		if err := h.svc.UpdatePassword(r.Context(), id, req.Password); err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to update password", "پاس ورڈ اپ ڈیٹ نہیں ہو سکا")
			return
		}
	}

	audit.Log(r.Context(), "UPDATE", "user", id, "User updated", getUserID(r))
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":    "User updated successfully",
		"message_ur": "صارف کامیابی سے اپ ڈیٹ ہو گیا",
	})
}

// Delete deletes a user (admin only)
func (h *UserHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		id = r.PathValue("id")
	}
	if id == "" {
		respondError(w, r, http.StatusBadRequest, "User ID required", "صارف کی آئی ڈی ضروری ہے")
		return
	}

	if err := h.svc.Delete(r.Context(), id); err != nil {
		respondError(w, r, http.StatusInternalServerError, err.Error(), "صارف حذف نہیں ہو سکا")
		return
	}

	audit.Log(r.Context(), "DELETE", "user", id, "User deleted", getUserID(r))
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":    "User deleted successfully",
		"message_ur": "صارف کامیابی سے حذف ہو گیا",
	})
}
