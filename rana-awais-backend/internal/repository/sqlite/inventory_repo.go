package sqlite

import (
	"context"
	"database/sql"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/google/uuid"
)

type InventoryRepository struct {
	db *sql.DB
}

func NewInventoryRepository(db *sql.DB) *InventoryRepository {
	return &InventoryRepository{db: db}
}

func (r *InventoryRepository) Create(ctx context.Context, item *domain.InventoryItem) error {
	if item.ID == "" {
		item.ID = uuid.New().String()
	}
	item.CreatedAt = time.Now()
	item.UpdatedAt = time.Now()

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO inventory_items (id, product_id, serial_number, color, model, engine_no, chassis_no, imei, company,
			status, purchase_date, purchase_price, selling_price, sold_date, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		item.ID, item.ProductID, item.SerialNumber, item.Color, item.Model, item.EngineNo, item.ChassisNo, item.IMEI, item.Company,
		item.Status, item.PurchaseDate, item.PurchasePrice, item.SellingPrice, item.SoldDate, item.CreatedAt, item.UpdatedAt)
	return err
}

func (r *InventoryRepository) GetByID(ctx context.Context, id string) (*domain.InventoryItem, error) {
	item := &domain.InventoryItem{}
	var color, model, engineNo, chassisNo, imei, company, soldDate sql.NullString
	var purchaseDate sql.NullTime
	err := r.db.QueryRowContext(ctx, `
		SELECT id, product_id, serial_number, color, model, engine_no, chassis_no, imei, company,
			status, purchase_date, purchase_price, selling_price, sold_date, created_at, updated_at
		FROM inventory_items WHERE id = ?`, id).Scan(
		&item.ID, &item.ProductID, &item.SerialNumber, &color, &model, &engineNo, &chassisNo, &imei, &company,
		&item.Status, &purchaseDate, &item.PurchasePrice, &item.SellingPrice, &soldDate, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	item.Color = color.String
	item.Model = model.String
	item.EngineNo = engineNo.String
	item.ChassisNo = chassisNo.String
	item.IMEI = imei.String
	item.Company = company.String
	if purchaseDate.Valid {
		item.PurchaseDate = purchaseDate.Time
	}
	if soldDate.Valid {
		t, _ := time.Parse("2006-01-02 15:04:05", soldDate.String)
		item.SoldDate = &t
	}
	return item, nil
}

func (r *InventoryRepository) Update(ctx context.Context, id string, item *domain.InventoryItem) error {
	item.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx, `
		UPDATE inventory_items SET product_id=?, serial_number=?, color=?, model=?, engine_no=?, chassis_no=?, imei=?, company=?,
			status=?, purchase_date=?, purchase_price=?, selling_price=?, sold_date=?, updated_at=?
		WHERE id=?`,
		item.ProductID, item.SerialNumber, item.Color, item.Model, item.EngineNo, item.ChassisNo, item.IMEI, item.Company,
		item.Status, item.PurchaseDate, item.PurchasePrice, item.SellingPrice, item.SoldDate, item.UpdatedAt, id)
	return err
}

func (r *InventoryRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM inventory_items WHERE id = ?", id)
	return err
}

func (r *InventoryRepository) List(ctx context.Context, skip, limit int64) ([]domain.InventoryItem, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, product_id, serial_number, color, model, engine_no, chassis_no, imei, company,
			status, purchase_date, purchase_price, selling_price, sold_date, created_at, updated_at
		FROM inventory_items ORDER BY created_at DESC LIMIT ? OFFSET ?`, limit, skip)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.InventoryItem
	for rows.Next() {
		var item domain.InventoryItem
		var color, model, engineNo, chassisNo, imei, company, soldDate sql.NullString
		var purchaseDate sql.NullTime
		err := rows.Scan(&item.ID, &item.ProductID, &item.SerialNumber, &color, &model, &engineNo, &chassisNo, &imei, &company,
			&item.Status, &purchaseDate, &item.PurchasePrice, &item.SellingPrice, &soldDate, &item.CreatedAt, &item.UpdatedAt)
		if err != nil {
			return nil, err
		}
		item.Color = color.String
		item.Model = model.String
		item.EngineNo = engineNo.String
		item.ChassisNo = chassisNo.String
		item.IMEI = imei.String
		item.Company = company.String
		if purchaseDate.Valid {
			item.PurchaseDate = purchaseDate.Time
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *InventoryRepository) GetBySerial(ctx context.Context, serial string) (*domain.InventoryItem, error) {
	item := &domain.InventoryItem{}
	var color, model, engineNo, chassisNo, imei, company, soldDate sql.NullString
	var purchaseDate sql.NullTime
	err := r.db.QueryRowContext(ctx, `
		SELECT id, product_id, serial_number, color, model, engine_no, chassis_no, imei, company,
			status, purchase_date, purchase_price, selling_price, sold_date, created_at, updated_at
		FROM inventory_items WHERE serial_number = ?`, serial).Scan(
		&item.ID, &item.ProductID, &item.SerialNumber, &color, &model, &engineNo, &chassisNo, &imei, &company,
		&item.Status, &purchaseDate, &item.PurchasePrice, &item.SellingPrice, &soldDate, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	item.Color = color.String
	item.Model = model.String
	item.EngineNo = engineNo.String
	item.ChassisNo = chassisNo.String
	item.IMEI = imei.String
	item.Company = company.String
	if purchaseDate.Valid {
		item.PurchaseDate = purchaseDate.Time
	}
	return item, nil
}

func (r *InventoryRepository) GetAgeingReport(ctx context.Context, olderThanDays int) ([]domain.InventoryItem, error) {
	cutoff := time.Now().AddDate(0, 0, -olderThanDays)
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, product_id, serial_number, color, model, engine_no, chassis_no, imei, company,
			status, purchase_date, purchase_price, selling_price, sold_date, created_at, updated_at
		FROM inventory_items WHERE created_at <= ? AND status = 'in_stock'`, cutoff)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.InventoryItem
	for rows.Next() {
		var item domain.InventoryItem
		var color, model, engineNo, chassisNo, imei, company, soldDate sql.NullString
		var purchaseDate sql.NullTime
		err := rows.Scan(&item.ID, &item.ProductID, &item.SerialNumber, &color, &model, &engineNo, &chassisNo, &imei, &company,
			&item.Status, &purchaseDate, &item.PurchasePrice, &item.SellingPrice, &soldDate, &item.CreatedAt, &item.UpdatedAt)
		if err != nil {
			return nil, err
		}
		item.Color = color.String
		item.Model = model.String
		item.EngineNo = engineNo.String
		item.ChassisNo = chassisNo.String
		item.IMEI = imei.String
		item.Company = company.String
		if purchaseDate.Valid {
			item.PurchaseDate = purchaseDate.Time
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *InventoryRepository) ListByProduct(ctx context.Context, productID string) ([]domain.InventoryItem, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, product_id, serial_number, color, model, engine_no, chassis_no, imei, company,
			status, purchase_date, purchase_price, selling_price, sold_date, created_at, updated_at
		FROM inventory_items WHERE product_id = ? ORDER BY created_at`, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.InventoryItem
	for rows.Next() {
		var item domain.InventoryItem
		var color, model, engineNo, chassisNo, imei, company, soldDate sql.NullString
		var purchaseDate sql.NullTime
		err := rows.Scan(&item.ID, &item.ProductID, &item.SerialNumber, &color, &model, &engineNo, &chassisNo, &imei, &company,
			&item.Status, &purchaseDate, &item.PurchasePrice, &item.SellingPrice, &soldDate, &item.CreatedAt, &item.UpdatedAt)
		if err != nil {
			return nil, err
		}
		item.Color = color.String
		item.Model = model.String
		item.EngineNo = engineNo.String
		item.ChassisNo = chassisNo.String
		item.IMEI = imei.String
		item.Company = company.String
		if purchaseDate.Valid {
			item.PurchaseDate = purchaseDate.Time
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *InventoryRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM inventory_items").Scan(&count)
	return count, err
}
