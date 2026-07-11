package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	mongoURI := "mongodb+srv://ranaawaiselectronics_db_user:1U9x9fOm9xqsPCoJ@cluster0.po0dsov.mongodb.net/?appName=Cluster0"

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("❌ Failed to connect: %v", err)
	}
	defer client.Disconnect(ctx)

	// List all databases
	databases, err := client.ListDatabaseNames(ctx, bson.M{})
	if err != nil {
		log.Fatalf("❌ Failed to list databases: %v", err)
	}
	fmt.Println("📚 Databases:", databases)

	// Check rana_awais_erp
	db := client.Database("rana_awais_erp")
	usersColl := db.Collection("users")

	count, _ := usersColl.CountDocuments(ctx, bson.M{})
	fmt.Printf("📊 Users in rana_awais_erp: %d\n", count)

	cursor, _ := usersColl.Find(ctx, bson.M{})
	for cursor.Next(ctx) {
		var user bson.M
		cursor.Decode(&user)
		fmt.Printf("   User: %+v\n", user)
	}
	cursor.Close(ctx)

	// Check myelectronics
	db2 := client.Database("myelectronics")
	usersColl2 := db2.Collection("users")

	count2, _ := usersColl2.CountDocuments(ctx, bson.M{})
	fmt.Printf("📊 Users in myelectronics: %d\n", count2)

	cursor2, _ := usersColl2.Find(ctx, bson.M{})
	for cursor2.Next(ctx) {
		var user bson.M
		cursor2.Decode(&user)
		fmt.Printf("   User: %+v\n", user)
	}
	cursor2.Close(ctx)
}
