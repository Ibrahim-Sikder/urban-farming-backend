-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VENDOR', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CertificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'MODERATE', 'CRITICAL', 'HARVEST_READY');

-- CreateEnum
CREATE TYPE "GrowthStage" AS ENUM ('SEEDLING', 'VEGETATIVE', 'FLOWERING', 'FRUITING', 'HARVESTING');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "profileImage" TEXT,
    "phoneNumber" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "farmName" TEXT NOT NULL,
    "farmDescription" TEXT,
    "farmLocation" TEXT NOT NULL,
    "certificationStatus" "CertificationStatus" NOT NULL DEFAULT 'PENDING',
    "totalRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produce" (
    "id" SERIAL NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "images" TEXT[],
    "certificationStatus" "CertificationStatus" NOT NULL DEFAULT 'PENDING',
    "availableQuantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "organicLabel" BOOLEAN NOT NULL DEFAULT false,
    "harvestDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalSpace" (
    "id" SERIAL NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "pricePerMonth" DOUBLE PRECISION NOT NULL,
    "soilType" TEXT,
    "sunlight" TEXT,
    "waterAccess" BOOLEAN NOT NULL DEFAULT true,
    "images" TEXT[],
    "amenities" TEXT[],
    "availability" BOOLEAN NOT NULL DEFAULT true,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalBooking" (
    "id" SERIAL NOT NULL,
    "spaceId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "specialRequests" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "produceId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "deliveryAddress" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3),
    "paymentMethod" TEXT NOT NULL,
    "paymentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "images" TEXT[],
    "tags" TEXT[],
    "likes" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityComment" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantTracking" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "plantName" TEXT NOT NULL,
    "plantType" TEXT NOT NULL,
    "variety" TEXT,
    "plantedDate" TIMESTAMP(3) NOT NULL,
    "expectedHarvestDate" TIMESTAMP(3) NOT NULL,
    "healthStatus" "HealthStatus" NOT NULL DEFAULT 'HEALTHY',
    "growthStage" "GrowthStage" NOT NULL DEFAULT 'SEEDLING',
    "temperature" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "soilMoisture" DOUBLE PRECISION,
    "lastWatered" TIMESTAMP(3),
    "lastFertilized" TIMESTAMP(3),
    "notes" TEXT,
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthLog" (
    "id" SERIAL NOT NULL,
    "plantId" INTEGER NOT NULL,
    "height" DOUBLE PRECISION,
    "leafCount" INTEGER,
    "healthStatus" "HealthStatus" NOT NULL,
    "growthStage" "GrowthStage" NOT NULL,
    "notes" TEXT,
    "imageUrl" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SustainabilityCert" (
    "id" SERIAL NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "certifyingAgency" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "certificationDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "verificationStatus" "CertificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedBy" INTEGER,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SustainabilityCert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_userId_key" ON "VendorProfile"("userId");

-- CreateIndex
CREATE INDEX "VendorProfile_certificationStatus_idx" ON "VendorProfile"("certificationStatus");

-- CreateIndex
CREATE INDEX "VendorProfile_isVerified_idx" ON "VendorProfile"("isVerified");

-- CreateIndex
CREATE INDEX "Produce_vendorId_idx" ON "Produce"("vendorId");

-- CreateIndex
CREATE INDEX "Produce_category_idx" ON "Produce"("category");

-- CreateIndex
CREATE INDEX "Produce_certificationStatus_idx" ON "Produce"("certificationStatus");

-- CreateIndex
CREATE INDEX "RentalSpace_vendorId_idx" ON "RentalSpace"("vendorId");

-- CreateIndex
CREATE INDEX "RentalSpace_availability_idx" ON "RentalSpace"("availability");

-- CreateIndex
CREATE INDEX "RentalBooking_userId_idx" ON "RentalBooking"("userId");

-- CreateIndex
CREATE INDEX "RentalBooking_spaceId_idx" ON "RentalBooking"("spaceId");

-- CreateIndex
CREATE INDEX "RentalBooking_status_idx" ON "RentalBooking"("status");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_vendorId_idx" ON "Order"("vendorId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "CommunityPost_userId_idx" ON "CommunityPost"("userId");

-- CreateIndex
CREATE INDEX "CommunityPost_createdAt_idx" ON "CommunityPost"("createdAt");

-- CreateIndex
CREATE INDEX "CommunityComment_postId_idx" ON "CommunityComment"("postId");

-- CreateIndex
CREATE INDEX "PlantTracking_userId_idx" ON "PlantTracking"("userId");

-- CreateIndex
CREATE INDEX "PlantTracking_healthStatus_idx" ON "PlantTracking"("healthStatus");

-- CreateIndex
CREATE INDEX "GrowthLog_plantId_idx" ON "GrowthLog"("plantId");

-- CreateIndex
CREATE UNIQUE INDEX "SustainabilityCert_vendorId_key" ON "SustainabilityCert"("vendorId");

-- CreateIndex
CREATE INDEX "SustainabilityCert_vendorId_idx" ON "SustainabilityCert"("vendorId");

-- CreateIndex
CREATE INDEX "SustainabilityCert_verificationStatus_idx" ON "SustainabilityCert"("verificationStatus");

-- AddForeignKey
ALTER TABLE "VendorProfile" ADD CONSTRAINT "VendorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produce" ADD CONSTRAINT "Produce_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalSpace" ADD CONSTRAINT "RentalSpace_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalBooking" ADD CONSTRAINT "RentalBooking_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "RentalSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalBooking" ADD CONSTRAINT "RentalBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_produceId_fkey" FOREIGN KEY ("produceId") REFERENCES "Produce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantTracking" ADD CONSTRAINT "PlantTracking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthLog" ADD CONSTRAINT "GrowthLog_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "PlantTracking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SustainabilityCert" ADD CONSTRAINT "SustainabilityCert_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
