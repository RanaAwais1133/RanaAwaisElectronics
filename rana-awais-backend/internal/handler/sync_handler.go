package handler

import (
	"net/http"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository/dual"
)

// SyncHandler handles sync-related API endpoints
type SyncHandler struct {
	syncEngine *dual.SyncEngine
	syncRepo   repository.SyncLogRepository
}

// NewSyncHandler creates a new sync handler
func NewSyncHandler(syncEngine *dual.SyncEngine, syncRepo repository.SyncLogRepository) *SyncHandler {
	return &SyncHandler{
		syncEngine: syncEngine,
		syncRepo:   syncRepo,
	}
}

// GetSyncStatus returns the current sync status
func (h *SyncHandler) GetSyncStatus(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	status, err := h.syncRepo.GetSyncStatus(ctx)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to get sync status: "+err.Error(), "")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    status,
	})
}

// ForceSync triggers an immediate sync
func (h *SyncHandler) ForceSync(w http.ResponseWriter, r *http.Request) {
	// Trigger sync in background
	h.syncEngine.ForceSync()

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Sync triggered successfully",
	})
}

// GetPendingSyncRecords returns pending sync records
func (h *SyncHandler) GetPendingSyncRecords(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	records, err := h.syncRepo.GetPendingSyncRecords(ctx)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to get pending records: "+err.Error(), "")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    records,
	})
}
