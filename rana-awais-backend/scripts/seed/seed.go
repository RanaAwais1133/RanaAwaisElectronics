package main

import (
	"context"
	"log"
	"time"

	"github.com/your-org/rana-awais-backend/config"
	"github.com/your-org/rana-awais-backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func main() {
	cfg := config.Load()
	config.ConnectDB(cfg)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	coll := config.DB.Collection("products")

	products := []domain.Product{
		{ID: primitive.NewObjectID(), Name: "Bike", NameUrdu: "بائیک", Company: "", CompanyUrdu: "", Category: "Vehicle", Price: 150000, InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Fridge", NameUrdu: "فرج", Company: "", CompanyUrdu: "", Category: "Home Appliance", Price: 85000, InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Micro Oven", NameUrdu: "مائکرو اوون", Company: "", CompanyUrdu: "", Category: "Home Appliance", Price: 25000, InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "AC", NameUrdu: "اے سی", Company: "", CompanyUrdu: "", Category: "Electronics", Price: 120000, InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Fans", NameUrdu: "پنکھے", Company: "", CompanyUrdu: "", Category: "Electronics", Price: 5000, InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Juicer Machine", NameUrdu: "جوسر مشین", Company: "", CompanyUrdu: "", Category: "Home Appliance", Price: 8000, InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Cooler", NameUrdu: "کولر", Company: "", CompanyUrdu: "", Category: "Home Appliance", Price: 18000, InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Washing Machine", NameUrdu: "واشنگ مشین", Company: "", CompanyUrdu: "", Category: "Home Appliance", Price: 55000, InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Dryer Machine", NameUrdu: "ڈرائر مشین", Company: "", CompanyUrdu: "", Category: "Home Appliance", Price: 40000, InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Deep Freezer", NameUrdu: "ڈیپ فریزر", Company: "", CompanyUrdu: "", Category: "Home Appliance", Price: 70000, InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Clothes (Blanket)", NameUrdu: "کپڑے (کمبل)", Company: "", CompanyUrdu: "", Category: "Clothing", Price: 3500, InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Mobile Phone", NameUrdu: "موبائل فون", Company: "", CompanyUrdu: "", Category: "Electronics", Price: 45000, InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "LCD", NameUrdu: "ایل سی ڈی", Company: "", CompanyUrdu: "", Category: "Electronics", Price: 95000, InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Geezer", NameUrdu: "گیزر", Company: "", CompanyUrdu: "", Category: "Home Appliance", Price: 22000, InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Iron", NameUrdu: "استری", Company: "", CompanyUrdu: "", Category: "Home Appliance", Price: 3000, InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
	}

	// Insert products (skip if already exist to avoid duplicates)
	for _, p := range products {
		var existing domain.Product
		err := coll.FindOne(ctx, bson.M{"name": p.Name}).Decode(&existing)
		if err == nil {
			log.Printf("Product %s already exists, skipping...", p.Name)
			continue
		}
		_, err = coll.InsertOne(ctx, p)
		if err != nil {
			log.Printf("Failed to insert product %s: %v", p.Name, err)
		} else {
			log.Printf("Inserted product: %s", p.Name)
		}
	}
	log.Println("✅ Seeding completed!")
}
