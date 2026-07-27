package sqlite

import (
	"context"
	"database/sql"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/google/uuid"
)

type SupplierRepository struct {
	db *sql.DB
}

func NewSupplierRepository(db *sql.DB) *SupplierRepository {
	return &SupplierRepository{db: db}
}

// ─── Suppliers ───
func (r *SupplierRepository) CreateSupplier(ctx context.Context, s *domain.Supplier) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	s.CreatedAt = time.Now()
	s.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO suppliers (id, name, name_urdu, phone, office_phone, cnic, address, company, remarks, created_at, updated_at)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		s.ID, s.Name, s.NameUrdu, s.Phone, s.OfficePhone, s.CNIC, s.Address, s.Company, s.Remarks, s.CreatedAt, s.UpdatedAt)
	return err
}

func (r *SupplierRepository) GetSupplier(ctx context.Context, id string) (*domain.Supplier, error) {
	s := &domain.Supplier{}
	var nameUrdu, phone, officePhone, cnic, address, company, remarks sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, name, name_urdu, phone, office_phone, cnic, address, company, remarks, created_at, updated_at FROM suppliers WHERE id=?`, id).
		Scan(&s.ID, &s.Name, &nameUrdu, &phone, &officePhone, &cnic, &address, &company, &remarks, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	s.NameUrdu = nameUrdu.String
	s.Phone = phone.String
	s.OfficePhone = officePhone.String
	s.CNIC = cnic.String
	s.Address = address.String
	s.Company = company.String
	s.Remarks = remarks.String
	return s, nil
}

func (r *SupplierRepository) UpdateSupplier(ctx context.Context, id string, s *domain.Supplier) error {
	s.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`UPDATE suppliers SET name=?, name_urdu=?, phone=?, office_phone=?, cnic=?, address=?, company=?, remarks=?, updated_at=? WHERE id=?`,
		s.Name, s.NameUrdu, s.Phone, s.OfficePhone, s.CNIC, s.Address, s.Company, s.Remarks, s.UpdatedAt, id)
	return err
}

func (r *SupplierRepository) DeleteSupplier(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM suppliers WHERE id=?", id)
	return err
}

func (r *SupplierRepository) ListSuppliers(ctx context.Context) ([]domain.Supplier, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, name, name_urdu, phone, office_phone, cnic, address, company, remarks, created_at, updated_at FROM suppliers ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []domain.Supplier
	for rows.Next() {
		var s domain.Supplier
		var nameUrdu, phone, officePhone, cnic, address, company, remarks sql.NullString
		if err := rows.Scan(&s.ID, &s.Name, &nameUrdu, &phone, &officePhone, &cnic, &address, &company, &remarks, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		s.NameUrdu = nameUrdu.String
		s.Phone = phone.String
		s.OfficePhone = officePhone.String
		s.CNIC = cnic.String
		s.Address = address.String
		s.Company = company.String
		s.Remarks = remarks.String
		list = append(list, s)
	}
	return list, nil
}

// ─── Purchases ───
func (r *SupplierRepository) CreatePurchase(ctx context.Context, p *domain.Purchase) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	p.CreatedAt = time.Now()
	p.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO purchases (id, supplier_id, total_amount, paid_amount, remaining_amount, payment_mode, due_date, status, remarks, created_by, created_at, updated_at)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
		p.ID, p.SupplierID, p.TotalAmount, p.PaidAmount, p.RemainingAmount, p.PaymentMode, p.DueDate, p.Status, p.Remarks, p.CreatedBy, p.CreatedAt, p.UpdatedAt)
	if err != nil {
		return err
	}
	// Insert purchase items
	for _, item := range p.Items {
		item.ID = uuid.New().String()
		item.PurchaseID = p.ID
		item.CreatedAt = time.Now()
		_, err := r.db.ExecContext(ctx,
			`INSERT INTO purchase_items (id, purchase_id, product_name, serial_number, imei, chassis_no, engine_no, model, color, price, sale_price, created_at)
			 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
			item.ID, item.PurchaseID, item.ProductName, item.SerialNumber, item.IMEI, item.ChassisNo, item.EngineNo, item.Model, item.Color, item.Price, item.SalePrice, item.CreatedAt)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *SupplierRepository) GetPurchase(ctx context.Context, id string) (*domain.Purchase, error) {
	p := &domain.Purchase{}
	var dueDate sql.NullTime
	var remarks, createdBy sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, supplier_id, total_amount, paid_amount, remaining_amount, payment_mode, due_date, status, remarks, created_by, created_at, updated_at FROM purchases WHERE id=?`, id).
		Scan(&p.ID, &p.SupplierID, &p.TotalAmount, &p.PaidAmount, &p.RemainingAmount, &p.PaymentMode, &dueDate, &p.Status, &remarks, &createdBy, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if dueDate.Valid {
		p.DueDate = &dueDate.Time
	}
	p.Remarks = remarks.String
	p.CreatedBy = createdBy.String
	// Fetch items
	rows, err := r.db.QueryContext(ctx, `SELECT id, purchase_id, product_name, serial_number, imei, chassis_no, engine_no, model, color, price, created_at FROM purchase_items WHERE purchase_id=?`, id)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var item domain.PurchaseItem
			var sn, im, cn, en, mo, co sql.NullString
			if err := rows.Scan(&item.ID, &item.PurchaseID, &item.ProductName, &sn, &im, &cn, &en, &mo, &co, &item.Price, &item.CreatedAt); err == nil {
				item.SerialNumber = sn.String
				item.IMEI = im.String
				item.ChassisNo = cn.String
				item.EngineNo = en.String
				item.Model = mo.String
				item.Color = co.String
				p.Items = append(p.Items, item)
			}
		}
	}
	return p, nil
}

func (r *SupplierRepository) ListPurchases(ctx context.Context, supplierID string) ([]domain.Purchase, error) {
	query := `SELECT id, supplier_id, total_amount, paid_amount, remaining_amount, payment_mode, due_date, status, remarks, created_by, created_at, updated_at FROM purchases`
	args := []interface{}{}
	if supplierID != "" {
		query += " WHERE supplier_id=?"
		args = append(args, supplierID)
	}
	query += " ORDER BY created_at DESC"
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []domain.Purchase
	for rows.Next() {
		var p domain.Purchase
		var dueDate sql.NullTime
		var remarks, createdBy sql.NullString
		if err := rows.Scan(&p.ID, &p.SupplierID, &p.TotalAmount, &p.PaidAmount, &p.RemainingAmount, &p.PaymentMode, &dueDate, &p.Status, &remarks, &createdBy, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		if dueDate.Valid {
			p.DueDate = &dueDate.Time
		}
		p.Remarks = remarks.String
		p.CreatedBy = createdBy.String
		// Fetch items for this purchase
		itemRows, err := r.db.QueryContext(ctx, `SELECT product_name, serial_number, imei, chassis_no, engine_no, model, color, price, sale_price FROM purchase_items WHERE purchase_id=?`, p.ID)
		if err == nil {
			for itemRows.Next() {
				var item domain.PurchaseItem
				var sn, im, cn, en, mo, co sql.NullString
				if itemRows.Scan(&item.ProductName, &sn, &im, &cn, &en, &mo, &co, &item.Price, &item.SalePrice) == nil {
					item.SerialNumber = sn.String
					item.IMEI = im.String
					item.ChassisNo = cn.String
					item.EngineNo = en.String
					item.Model = mo.String
					item.Color = co.String
					p.Items = append(p.Items, item)
				}
			}
			itemRows.Close()
		}
		list = append(list, p)
	}
	return list, nil
}

// ─── Supplier Payments ───
func (r *SupplierRepository) CreatePayment(ctx context.Context, pay *domain.SupplierPayment) error {
	if pay.ID == "" {
		pay.ID = uuid.New().String()
	}
	pay.CreatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO supplier_payments (id, supplier_id, purchase_id, amount, method, payment_date, remarks, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
		pay.ID, pay.SupplierID, pay.PurchaseID, pay.Amount, pay.Method, pay.PaymentDate, pay.Remarks, pay.CreatedBy, pay.CreatedAt)
	return err
}

func (r *SupplierRepository) ListPayments(ctx context.Context, supplierID string) ([]domain.SupplierPayment, error) {
	query := `SELECT id, supplier_id, purchase_id, amount, method, payment_date, remarks, created_by, created_at FROM supplier_payments`
	args := []interface{}{}
	if supplierID != "" {
		query += " WHERE supplier_id=?"
		args = append(args, supplierID)
	}
	query += " ORDER BY payment_date DESC"
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []domain.SupplierPayment
	for rows.Next() {
		var p domain.SupplierPayment
		var purchaseID, remarks, createdBy sql.NullString
		if err := rows.Scan(&p.ID, &p.SupplierID, &purchaseID, &p.Amount, &p.Method, &p.PaymentDate, &remarks, &createdBy, &p.CreatedAt); err != nil {
			return nil, err
		}
		p.PurchaseID = purchaseID.String
		p.Remarks = remarks.String
		p.CreatedBy = createdBy.String
		list = append(list, p)
	}
	return list, nil
}

// ─── Supplier Promises ───
func (r *SupplierRepository) CreatePromise(ctx context.Context, pr *domain.SupplierPromise) error {
	if pr.ID == "" {
		pr.ID = uuid.New().String()
	}
	pr.CreatedAt = time.Now()
	pr.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO supplier_promises (id, supplier_id, purchase_id, amount, due_date, paid_amount, status, remarks, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		pr.ID, pr.SupplierID, pr.PurchaseID, pr.Amount, pr.DueDate, pr.PaidAmount, pr.Status, pr.Remarks, pr.CreatedBy, pr.CreatedAt, pr.UpdatedAt)
	return err
}

func (r *SupplierRepository) ListPromises(ctx context.Context, status string) ([]domain.SupplierPromise, error) {
	query := `SELECT id, supplier_id, purchase_id, amount, due_date, paid_amount, status, remarks, created_by, created_at, updated_at FROM supplier_promises`
	args := []interface{}{}
	if status != "" {
		query += " WHERE status=?"
		args = append(args, status)
	}
	query += " ORDER BY due_date ASC"
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []domain.SupplierPromise
	for rows.Next() {
		var pr domain.SupplierPromise
		var purchaseID, remarks, createdBy sql.NullString
		if err := rows.Scan(&pr.ID, &pr.SupplierID, &purchaseID, &pr.Amount, &pr.DueDate, &pr.PaidAmount, &pr.Status, &remarks, &createdBy, &pr.CreatedAt, &pr.UpdatedAt); err != nil {
			return nil, err
		}
		pr.PurchaseID = purchaseID.String
		pr.Remarks = remarks.String
		pr.CreatedBy = createdBy.String
		list = append(list, pr)
	}
	return list, nil
}

func (r *SupplierRepository) UpdatePurchasePaid(ctx context.Context, id string, paidAmount, remainingAmount float64, status string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE purchases SET paid_amount=?, remaining_amount=?, status=?, updated_at=? WHERE id=?`,
		paidAmount, remainingAmount, status, time.Now(), id)
	return err
}

func (r *SupplierRepository) CreateProductFromPurchase(ctx context.Context, item domain.PurchaseItem) error {
	var serialNumber, imei, chassisNo, engineNo, model, color sql.NullString
	if item.SerialNumber != "" { serialNumber.String = item.SerialNumber; serialNumber.Valid = true }
	if item.IMEI != "" { imei.String = item.IMEI; imei.Valid = true }
	if item.ChassisNo != "" { chassisNo.String = item.ChassisNo; chassisNo.Valid = true }
	if item.EngineNo != "" { engineNo.String = item.EngineNo; engineNo.Valid = true }
	if item.Model != "" { model.String = item.Model; model.Valid = true }
	if item.Color != "" { color.String = item.Color; color.Valid = true }
	
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO products (id, name, name_urdu, category, price, purchase_price, serial_number, imei, chassis_no, engine_no, model, color, in_stock, stock_count, created_at, updated_at)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		uuid.New().String(), item.ProductName, item.ProductName, "Purchase", item.Price, item.Price,
		serialNumber, imei, chassisNo, engineNo, model, color, 1, 1, time.Now(), time.Now())
	return err
}

func (r *SupplierRepository) UpdatePromise(ctx context.Context, id string, pr *domain.SupplierPromise) error {
	pr.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`UPDATE supplier_promises SET paid_amount=?, status=?, remarks=?, updated_at=? WHERE id=?`,
		pr.PaidAmount, pr.Status, pr.Remarks, pr.UpdatedAt, id)
	return err
}

// RunPurchaseItemsMigration ensures sale_price column exists
func (r *SupplierRepository) RunPurchaseItemsMigration() {
	r.db.Exec("ALTER TABLE purchase_items ADD COLUMN sale_price REAL DEFAULT 0")
}
