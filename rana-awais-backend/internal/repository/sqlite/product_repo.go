package sqlite

import (
	"context"
	"database/sql"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/google/uuid"
)

type ProductRepository struct {
	db *sql.DB
}

func NewProductRepository(db *sql.DB) *ProductRepository {
	return &ProductRepository{db: db}
}

func (r *ProductRepository) Create(ctx context.Context, p *domain.Product) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	p.CreatedAt = time.Now()
	p.UpdatedAt = time.Now()
	
	// Auto-set in_stock based on stock_count
	if p.StockCount > 0 {
		p.InStock = true
	} else {
		p.InStock = false
	}

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO products (id, name, name_urdu, company, company_urdu, category, price, purchase_price, description, in_stock, stock_count, sku, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.ID, p.Name, p.NameUrdu, p.Company, p.CompanyUrdu, p.Category, p.Price, p.PurchasePrice, p.Description, boolToInt(p.InStock), p.StockCount, p.SKU, p.CreatedAt, p.UpdatedAt)
	return err
}


func (r *ProductRepository) GetByID(ctx context.Context, id string) (*domain.Product, error) {
	p := &domain.Product{}
	var nameUrdu, company, companyUrdu, description, sku sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT id, name, name_urdu, company, company_urdu, category, price, purchase_price, description, in_stock, stock_count, sku, created_at, updated_at
		FROM products WHERE id = ?`, id).Scan(
		&p.ID, &p.Name, &nameUrdu, &company, &companyUrdu, &p.Category, &p.Price, &p.PurchasePrice, &description, &p.InStock, &p.StockCount, &sku, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	p.NameUrdu = nameUrdu.String
	p.Company = company.String
	p.CompanyUrdu = companyUrdu.String
	p.Description = description.String
	p.SKU = sku.String
	return p, nil
}

func (r *ProductRepository) GetByIDWithStock(ctx context.Context, id string) (*domain.Product, error) {
	return r.GetByID(ctx, id)
}

func (r *ProductRepository) Update(ctx context.Context, id string, p *domain.Product) error {
	p.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx, `
		UPDATE products SET name=?, name_urdu=?, company=?, company_urdu=?, category=?, price=?, purchase_price=?, description=?, in_stock=?, stock_count=?, sku=?, updated_at=?
		WHERE id=?`,
		p.Name, p.NameUrdu, p.Company, p.CompanyUrdu, p.Category, p.Price, p.PurchasePrice, p.Description, boolToInt(p.InStock), p.StockCount, p.SKU, p.UpdatedAt, id)
	return err
}

func (r *ProductRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM products WHERE id = ?", id)
	return err
}

func (r *ProductRepository) List(ctx context.Context, skip, limit int64) ([]domain.Product, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, name_urdu, company, company_urdu, category, price, purchase_price, description, in_stock, stock_count, sku, created_at, updated_at
		FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?`, limit, skip)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []domain.Product
	for rows.Next() {
		var p domain.Product
		var nameUrdu, company, companyUrdu, description, sku sql.NullString
		err := rows.Scan(&p.ID, &p.Name, &nameUrdu, &company, &companyUrdu, &p.Category, &p.Price, &p.PurchasePrice, &description, &p.InStock, &p.StockCount, &sku, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			return nil, err
		}
		p.NameUrdu = nameUrdu.String
		p.Company = company.String
		p.CompanyUrdu = companyUrdu.String
		p.Description = description.String
		p.SKU = sku.String
		products = append(products, p)
	}
	return products, nil
}

func (r *ProductRepository) ListByCategory(ctx context.Context, category string) ([]domain.Product, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, name_urdu, company, company_urdu, category, price, purchase_price, description, in_stock, stock_count, sku, created_at, updated_at
		FROM products WHERE category = ? ORDER BY name`, category)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []domain.Product
	for rows.Next() {
		var p domain.Product
		var nameUrdu, company, companyUrdu, description, sku sql.NullString
		err := rows.Scan(&p.ID, &p.Name, &nameUrdu, &company, &companyUrdu, &p.Category, &p.Price, &p.PurchasePrice, &description, &p.InStock, &p.StockCount, &sku, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			return nil, err
		}
		p.NameUrdu = nameUrdu.String
		p.Company = company.String
		p.CompanyUrdu = companyUrdu.String
		p.Description = description.String
		p.SKU = sku.String
		products = append(products, p)
	}
	return products, nil
}

func (r *ProductRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM products").Scan(&count)
	return count, err
}

// Search performs text search on products across multiple fields
func (r *ProductRepository) Search(ctx context.Context, query string, skip, limit int64) ([]domain.Product, error) {
	searchQuery := "%" + query + "%"
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, name_urdu, company, company_urdu, category, price, purchase_price, description, in_stock, stock_count, sku, created_at, updated_at
		FROM products 
		WHERE name LIKE ? OR name_urdu LIKE ? OR category LIKE ? OR company LIKE ? OR company_urdu LIKE ? OR description LIKE ? OR sku LIKE ?
		ORDER BY created_at DESC LIMIT ? OFFSET ?`,
		searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, limit, skip)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []domain.Product
	for rows.Next() {
		var p domain.Product
		var nameUrdu, company, companyUrdu, description, sku sql.NullString
		err := rows.Scan(&p.ID, &p.Name, &nameUrdu, &company, &companyUrdu, &p.Category, &p.Price, &p.PurchasePrice, &description, &p.InStock, &p.StockCount, &sku, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			return nil, err
		}
		p.NameUrdu = nameUrdu.String
		p.Company = company.String
		p.CompanyUrdu = companyUrdu.String
		p.Description = description.String
		p.SKU = sku.String
		products = append(products, p)
	}
	return products, nil
}

// BulkDelete deletes multiple products by IDs
func (r *ProductRepository) BulkDelete(ctx context.Context, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	// Build placeholders for IN clause
	placeholders := make([]string, len(ids))
	args := make([]interface{}, len(ids))
	for i, id := range ids {
		placeholders[i] = "?"
		args[i] = id
	}
	query := "DELETE FROM products WHERE id IN (" + joinStrings(placeholders, ",") + ")"
	_, err := r.db.ExecContext(ctx, query, args...)
	return err
}

// GetLowStock returns products with stock below threshold
func (r *ProductRepository) GetLowStock(ctx context.Context, threshold int) ([]domain.Product, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, name_urdu, company, company_urdu, category, price, purchase_price, description, in_stock, stock_count, sku, created_at, updated_at
		FROM products 
		WHERE stock_count <= ? AND stock_count >= 0
		ORDER BY stock_count ASC`, threshold)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []domain.Product
	for rows.Next() {
		var p domain.Product
		var nameUrdu, company, companyUrdu, description, sku sql.NullString
		err := rows.Scan(&p.ID, &p.Name, &nameUrdu, &company, &companyUrdu, &p.Category, &p.Price, &p.PurchasePrice, &description, &p.InStock, &p.StockCount, &sku, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			return nil, err
		}
		p.NameUrdu = nameUrdu.String
		p.Company = company.String
		p.CompanyUrdu = companyUrdu.String
		p.Description = description.String
		p.SKU = sku.String
		products = append(products, p)
	}
	return products, nil
}

// joinStrings joins a slice of strings with a separator
func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}
