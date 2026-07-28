package mongodb

import (
	"context"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type SupplierMongoRepo struct {
	suppliers *mongo.Collection
	purchases *mongo.Collection
	pitems    *mongo.Collection
	payments  *mongo.Collection
	promises  *mongo.Collection
}

func NewSupplierMongoRepo(db *mongo.Database) *SupplierMongoRepo {
	return &SupplierMongoRepo{
		suppliers: db.Collection("suppliers"),
		purchases: db.Collection("purchases"),
		pitems:    db.Collection("purchase_items"),
		payments:  db.Collection("supplier_payments"),
		promises:  db.Collection("supplier_promises"),
	}
}

// ─── Suppliers ───
func (r *SupplierMongoRepo) CreateSupplier(ctx context.Context, s *domain.Supplier) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	s.CreatedAt = time.Now()
	s.UpdatedAt = time.Now()
	_, err := r.suppliers.InsertOne(ctx, s)
	return err
}

func (r *SupplierMongoRepo) GetSupplier(ctx context.Context, id string) (*domain.Supplier, error) {
	var s domain.Supplier
	err := r.suppliers.FindOne(ctx, bson.M{"_id": id}).Decode(&s)
	if err != nil {
		return nil, nil
	}
	return &s, nil
}

func (r *SupplierMongoRepo) UpdateSupplier(ctx context.Context, id string, s *domain.Supplier) error {
	s.UpdatedAt = time.Now()
	_, err := r.suppliers.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": s})
	return err
}

func (r *SupplierMongoRepo) DeleteSupplier(ctx context.Context, id string) error {
	_, err := r.suppliers.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (r *SupplierMongoRepo) ListSuppliers(ctx context.Context) ([]domain.Supplier, error) {
	cursor, err := r.suppliers.Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "createdat", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var list []domain.Supplier
	cursor.All(ctx, &list)
	if list == nil {
		list = []domain.Supplier{}
	}
	return list, nil
}

// ─── Purchases ───
func (r *SupplierMongoRepo) CreatePurchase(ctx context.Context, p *domain.Purchase) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	p.CreatedAt = time.Now()
	p.UpdatedAt = time.Now()
	_, err := r.purchases.InsertOne(ctx, p)
	if err != nil {
		return err
	}
	// Insert items
	for i := range p.Items {
		p.Items[i].ID = uuid.New().String()
		p.Items[i].PurchaseID = p.ID
		p.Items[i].CreatedAt = time.Now()
		r.pitems.InsertOne(ctx, p.Items[i])
	}
	return nil
}

func (r *SupplierMongoRepo) GetPurchase(ctx context.Context, id string) (*domain.Purchase, error) {
	var p domain.Purchase
	err := r.purchases.FindOne(ctx, bson.M{"_id": id}).Decode(&p)
	if err != nil {
		return nil, nil
	}
	// Fetch items
	cursor, _ := r.pitems.Find(ctx, bson.M{"purchaseid": id})
	if cursor != nil {
		defer cursor.Close(ctx)
		cursor.All(ctx, &p.Items)
	}
	return &p, nil
}

func (r *SupplierMongoRepo) ListPurchases(ctx context.Context, supplierID string) ([]domain.Purchase, error) {
	filter := bson.M{}
	if supplierID != "" {
		filter["supplierid"] = supplierID
	}
	cursor, err := r.purchases.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "createdat", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var list []domain.Purchase
	cursor.All(ctx, &list)
	if list == nil {
		list = []domain.Purchase{}
	}
	// Fetch items for each purchase
	if r.pitems != nil {
		for i := range list {
			itemCursor, _ := r.pitems.Find(ctx, bson.M{"purchaseid": list[i].ID})
			if itemCursor != nil {
				var items []domain.PurchaseItem
				itemCursor.All(ctx, &items)
				if items == nil {
					items = []domain.PurchaseItem{}
				}
				list[i].Items = items
				itemCursor.Close(ctx)
			}
		}
	}
	return list, nil
}

func (r *SupplierMongoRepo) UpdatePurchasePaid(ctx context.Context, id string, paidAmount, remainingAmount float64, status string) error {
	_, err := r.purchases.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": bson.M{
		"paidamount": paidAmount, "remainingamount": remainingAmount,
		"status": status, "updatedat": time.Now(),
	}})
	return err
}

func (r *SupplierMongoRepo) UpdatePurchaseFull(ctx context.Context, id string, totalAmount, paidAmount, remainingAmount float64, paymentMode string, dueDate *time.Time, status, remarks string) error {
	update := bson.M{
		"totalamount": totalAmount, "paidamount": paidAmount,
		"remainingamount": remainingAmount, "paymentmode": paymentMode,
		"status": status, "remarks": remarks, "updatedat": time.Now(),
	}
	if dueDate != nil {
		update["duedate"] = dueDate
	} else {
		update["duedate"] = nil
	}
	_, err := r.purchases.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": update})
	return err
}

// ─── Payments ───
func (r *SupplierMongoRepo) CreatePayment(ctx context.Context, pay *domain.SupplierPayment) error {
	if pay.ID == "" {
		pay.ID = uuid.New().String()
	}
	pay.CreatedAt = time.Now()
	_, err := r.payments.InsertOne(ctx, pay)
	return err
}

func (r *SupplierMongoRepo) ListPayments(ctx context.Context, supplierID string) ([]domain.SupplierPayment, error) {
	filter := bson.M{}
	if supplierID != "" {
		filter["supplierid"] = supplierID
	}
	cursor, err := r.payments.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "paymentdate", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var list []domain.SupplierPayment
	cursor.All(ctx, &list)
	if list == nil {
		list = []domain.SupplierPayment{}
	}
	return list, nil
}

func (r *SupplierMongoRepo) GetPayment(ctx context.Context, id string) (*domain.SupplierPayment, error) {
	var pay domain.SupplierPayment
	err := r.payments.FindOne(ctx, bson.M{"_id": id}).Decode(&pay)
	if err != nil {
		return nil, nil
	}
	return &pay, nil
}

func (r *SupplierMongoRepo) UpdatePayment(ctx context.Context, id string, amount float64, method string, paymentDate time.Time, remarks string) error {
	_, err := r.payments.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": bson.M{
		"amount": amount, "method": method, "paymentdate": paymentDate, "remarks": remarks, "updatedat": time.Now(),
	}})
	return err
}

func (r *SupplierMongoRepo) DeletePayment(ctx context.Context, id string) error {
	_, err := r.payments.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

// ─── Promises ───
func (r *SupplierMongoRepo) CreatePromise(ctx context.Context, pr *domain.SupplierPromise) error {
	if pr.ID == "" {
		pr.ID = uuid.New().String()
	}
	pr.CreatedAt = time.Now()
	pr.UpdatedAt = time.Now()
	_, err := r.promises.InsertOne(ctx, pr)
	return err
}

func (r *SupplierMongoRepo) ListPromises(ctx context.Context, supplierID string) ([]domain.SupplierPromise, error) {
	filter := bson.M{}
	if supplierID != "" {
		filter["supplierid"] = supplierID
	}
	cursor, err := r.promises.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "duedate", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var list []domain.SupplierPromise
	cursor.All(ctx, &list)
	if list == nil {
		list = []domain.SupplierPromise{}
	}
	return list, nil
}

func (r *SupplierMongoRepo) UpdatePromise(ctx context.Context, id string, paidAmount float64, status string) error {
	_, err := r.promises.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": bson.M{
		"paidamount": paidAmount, "status": status, "updatedat": time.Now(),
	}})
	return err
}
