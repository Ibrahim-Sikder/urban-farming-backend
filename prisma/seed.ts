import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seeding...');

    // Check if DATABASE_URL exists
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is not defined in environment variables');
        process.exit(1);
    }

    try {
        // 1. Create Admin
        console.log('📝 Creating admin...');
        const admin = await prisma.user.upsert({
            where: { email: 'admin@urbanfarming.com' },
            update: {},
            create: {
                name: 'Super Admin',
                email: 'admin@urbanfarming.com',
                password: await bcrypt.hash('Admin@123', 10),
                role: 'ADMIN',
                status: 'ACTIVE',
                phoneNumber: '+8801700000000',
                address: 'Dhaka, Bangladesh'
            }
        });
        console.log(`✅ Created admin: ${admin.email}`);

        // 2. Create 10 Vendors
        const vendors: { id: number; farmName: string }[] = [];
        const categories = ['Vegetables', 'Fruits', 'Herbs', 'Microgreens', 'Mushrooms'];

        console.log('📝 Creating 10 vendors...');
        for (let i = 1; i <= 10; i++) {
            const user = await prisma.user.create({
                data: {
                    name: `Vendor ${i}`,
                    email: `vendor${i}@urbanfarming.com`,
                    password: await bcrypt.hash('Vendor@123', 10),
                    role: 'VENDOR',
                    status: 'ACTIVE',
                    phoneNumber: `+880171000000${i}`,
                    address: `Farm Address ${i}, Dhaka`
                }
            });

            const vendor = await prisma.vendorProfile.create({
                data: {
                    userId: user.id,
                    farmName: `Organic Farm ${i}`,
                    farmDescription: `This is a certified organic farm.`,
                    farmLocation: JSON.stringify({
                        lat: 23.8103 + (i * 0.01),
                        lng: 90.4125 + (i * 0.01),
                        address: `Dhaka, Bangladesh`
                    }),
                    certificationStatus: 'APPROVED',
                    isVerified: true,
                    totalRating: 4.5,
                    ratingCount: 10
                }
            });

            // Sustainability certification
            await prisma.sustainabilityCert.create({
                data: {
                    vendorId: vendor.id,
                    certifyingAgency: 'Bangladesh Organic Certification Body',
                    certificateNumber: `ORG${i}${Date.now()}`,
                    certificationDate: new Date(),
                    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    documentUrl: `https://storage.urbanfarming.com/certs/vendor${i}.pdf`,
                    verificationStatus: 'APPROVED',
                    verifiedBy: admin.id,
                    verifiedAt: new Date()
                }
            });

            // Create 10 rental spaces per vendor
            for (let j = 1; j <= 10; j++) {
                await prisma.rentalSpace.create({
                    data: {
                        vendorId: vendor.id,
                        name: `Garden Plot ${j} at ${vendor.farmName}`,
                        description: `Beautiful ${j * 50} sq ft plot.`,
                        location: JSON.stringify({
                            lat: 23.8103 + (i * 0.01) + (j * 0.001),
                            lng: 90.4125 + (i * 0.01) + (j * 0.001),
                            address: `Plot ${j}, Dhaka`
                        }),
                        size: j * 50,
                        pricePerMonth: 2000 + (j * 200),
                        soilType: 'Loamy',
                        sunlight: 'Full Sun',
                        waterAccess: true,
                        images: [`https://storage.urbanfarming.com/spaces/plot${j}.jpg`],
                        amenities: ['water', 'electricity', 'tools'],
                        availability: true,
                        isApproved: true
                    }
                });
            }

            // Create 10 products per vendor (100 total)
            for (let k = 1; k <= 10; k++) {
                const categoryIndex = (k - 1) % categories.length;
                const category = categories[categoryIndex] || 'Vegetables';

                await prisma.produce.create({
                    data: {
                        vendorId: vendor.id,
                        name: `Organic ${category} ${k}`,
                        description: `Fresh, chemical-free ${category}.`,
                        price: 50 + (k * 10),
                        category: category,
                        subCategory: 'Organic',
                        images: [`https://storage.urbanfarming.com/products/produce${k}.jpg`],
                        certificationStatus: 'APPROVED',
                        availableQuantity: 100 + (k * 20),
                        unit: 'kg',
                        organicLabel: true,
                        harvestDate: new Date()
                    }
                });
            }

            vendors.push({ id: vendor.id, farmName: vendor.farmName });
            console.log(`✅ Created vendor ${i}/10`);
        }

        // 3. Create 20 Customers
        const customers: { id: number; address: string | null }[] = [];
        console.log('📝 Creating 20 customers...');
        for (let i = 1; i <= 20; i++) {
            const user = await prisma.user.create({
                data: {
                    name: `Customer ${i}`,
                    email: `customer${i}@example.com`,
                    password: await bcrypt.hash('Customer@123', 10),
                    role: 'CUSTOMER',
                    status: 'ACTIVE',
                    phoneNumber: `+880172000000${i}`,
                    address: `Customer Address ${i}, Dhaka`
                }
            });
            customers.push({ id: user.id, address: user.address });

            // Plant tracking (3 each = 60)
            for (let j = 1; j <= 3; j++) {
                await prisma.plantTracking.create({
                    data: {
                        userId: user.id,
                        plantName: `Tomato Plant ${j}`,
                        plantType: 'Tomato',
                        variety: 'Heirloom',
                        plantedDate: new Date(Date.now() - j * 7 * 24 * 60 * 60 * 1000),
                        expectedHarvestDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        healthStatus: 'HEALTHY',
                        growthStage: 'VEGETATIVE',
                        lastWatered: new Date(),
                        notes: 'Growing well',
                        images: []
                    }
                });
            }

            // Community posts (2 each = 40)
            for (let j = 1; j <= 2; j++) {
                await prisma.communityPost.create({
                    data: {
                        userId: user.id,
                        title: `My urban gardening experience ${j}`,
                        content: `I've been growing vegetables on my balcony for ${j} months.`,
                        tags: ['urbanfarming', 'organic'],
                        images: [],
                        likes: Math.floor(Math.random() * 50),
                        shares: Math.floor(Math.random() * 10),
                        isApproved: true
                    }
                });
            }

            console.log(`✅ Created customer ${i}/20`);
        }

        // 4. Create 50 Orders
        console.log('📝 Creating 50 orders...');
        for (let i = 1; i <= 50; i++) {
            const customer = customers[Math.floor(Math.random() * customers.length)];
            const vendor = vendors[Math.floor(Math.random() * vendors.length)];

            if (customer && vendor) {
                const produce = await prisma.produce.findFirst({
                    where: { vendorId: vendor.id }
                });

                if (produce) {
                    await prisma.order.create({
                        data: {
                            userId: customer.id,
                            vendorId: vendor.id,
                            produceId: produce.id,
                            quantity: Math.floor(Math.random() * 5) + 1,
                            unitPrice: produce.price,
                            totalPrice: produce.price * (Math.floor(Math.random() * 5) + 1),
                            status: 'COMPLETED',
                            deliveryAddress: customer.address || 'Dhaka',
                            paymentMethod: 'bkash',
                            paymentId: `PAY${Date.now()}${i}`,
                            createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
                        }
                    });
                }
            }
            if (i % 10 === 0) console.log(`   Created ${i}/50 orders`);
        }

        // 5. Create 30 Rental Bookings
        console.log('📝 Creating 30 rental bookings...');
        for (let i = 1; i <= 30; i++) {
            const customer = customers[Math.floor(Math.random() * customers.length)];
            const vendor = vendors[Math.floor(Math.random() * vendors.length)];

            if (customer && vendor) {
                const rentalSpace = await prisma.rentalSpace.findFirst({
                    where: { vendorId: vendor.id, availability: true }
                });

                if (rentalSpace) {
                    const startDate = new Date();
                    const endDate = new Date();
                    endDate.setMonth(endDate.getMonth() + 1);

                    await prisma.rentalBooking.create({
                        data: {
                            spaceId: rentalSpace.id,
                            userId: customer.id,
                            startDate: startDate,
                            endDate: endDate,
                            totalPrice: rentalSpace.pricePerMonth,
                            status: 'COMPLETED',
                            paymentStatus: 'paid'
                        }
                    });
                }
            }
            if (i % 10 === 0) console.log(`   Created ${i}/30 bookings`);
        }

        // Summary
        const userCount = await prisma.user.count();
        const vendorCount = await prisma.vendorProfile.count();
        const productCount = await prisma.produce.count();
        const rentalSpaceCount = await prisma.rentalSpace.count();

        console.log('\n📊 Seeding Summary:');
        console.log(`✅ Roles: ADMIN, VENDOR, CUSTOMER (3 roles)`);
        console.log(`✅ Users: ${userCount} (1 Admin + 10 Vendors + 20 Customers = 31)`);
        console.log(`✅ Vendors: ${vendorCount} (10 - as required)`);
        console.log(`✅ Products: ${productCount} (100 - as required)`);
        console.log(`✅ Rental Spaces: ${rentalSpaceCount} (100)`);
        console.log('\n🎉 Seeding completed successfully!');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });