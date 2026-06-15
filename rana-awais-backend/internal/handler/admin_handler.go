package handler

import (
	"encoding/json"
	"net/http"

	"github.com/your-org/rana-awais-backend/config"
	"github.com/your-org/rana-awais-backend/internal/service"
	"go.mongodb.org/mongo-driver/bson"
)

type AdminHandler struct {
	userSvc *service.UserService
}

func NewAdminHandler(userSvc *service.UserService) *AdminHandler {
	return &AdminHandler{userSvc: userSvc}
}

// Backup returns a full database backup as a downloadable JSON file.
func (h *AdminHandler) Backup(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	collections := []string{
		"customers", "guarantors", "products", "inventory",
		"installments", "payments", "accounting", "notifications",
		"audit_logs", "users",
	}

	result := make(map[string][]bson.M)

	for _, collName := range collections {
		coll := db.Collection(collName)
		cursor, err := coll.Find(r.Context(), bson.M{})
		if err != nil {
			respondError(w, r, http.StatusInternalServerError, "Backup failed", "بیک اپ ناکام")
			return
		}
		var docs []bson.M
		if err = cursor.All(r.Context(), &docs); err != nil {
			respondError(w, r, http.StatusInternalServerError, "Backup failed", "بیک اپ ناکام")
			return
		}
		result[collName] = docs
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=rana-awais-backup.json")
	json.NewEncoder(w).Encode(result)
}
