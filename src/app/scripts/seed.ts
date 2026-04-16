import { PrismaClient, Role, UserStatus, CertificationStatus, OrderStatus, HealthStatus, GrowthStage } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seeding...');

    // Create Admin
    const admin = await prisma.user.upsert({
        where: { email: 'admin@urbanfarming.com' },
        update: {},
        create: {
            name: 'Super Admin',
            email: 'admin@urbanfarming.com',
            password: await bcrypt.hash('Admin@123', 10),
            role: Role.ADMIN,
            status: UserStatus.ACTIVE,
            phoneNumber: '+8801700000000',
            address: 'Dhaka, Bangladesh'
        }
    });
    console.log(`✅ Created admin: ${admin.email}`);

    // Create 10 vendors with products
    const vendors: { id: number; farmName: string }[] = [];
    const categories = ['Vegetables', 'Fruits', 'Herbs', 'Microgreens', 'Mushrooms'];

    for (let i = 1; i <= 10; i++) {
        const user = await prisma.user.create({
            data: {
                name: `Vendor ${i}`,
                email: `vendor${i}@urbanfarming.com`,
                password: await bcrypt.hash('Vendor@123', 10),
                role: Role.VENDOR,
                status: UserStatus.ACTIVE,
                phoneNumber: `+880171000000${i}`,
                address: `Farm Address ${i}, Dhaka`
            }
        });

        const vendor = await prisma.vendorProfile.create({
            data: {
                userId: user.id,
                farmName: `Organic Farm ${i}`,
                farmDescription: `This is a certified organic farm producing fresh vegetables and fruits.`,
                farmLocation: JSON.stringify({
                    lat: 23.8103 + (i * 0.01),
                    lng: 90.4125 + (i * 0.01),
                    address: `Dhaka, Bangladesh`
                }),
                certificationStatus: CertificationStatus.APPROVED,
                isVerified: true,
                totalRating: 4.5,
                ratingCount: 10
            }
        });

        // Create sustainability certification for each vendor
        await prisma.sustainabilityCert.create({
            data: {
                vendorId: vendor.id,
                certifyingAgency: 'Bangladesh Organic Certification Body',
                certificateNumber: `ORG${i}${Date.now()}`,
                certificationDate: new Date(),
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                documentUrl: `https://storage.urbanfarming.com/certs/vendor${i}.pdf`,
                verificationStatus: CertificationStatus.APPROVED,
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
                    description: `Beautiful ${j * 50} sq ft plot with rich soil and direct sunlight.`,
                    location: JSON.stringify({
                        lat: 23.8103 + (i * 0.01) + (j * 0.001),
                        lng: 90.4125 + (i * 0.01) + (j * 0.001),
                        address: `Plot ${j}, ${vendor.farmName}, Dhaka`
                    }),
                    size: j * 50,
                    pricePerMonth: 2000 + (j * 200),
                    soilType: 'Loamy',
                    sunlight: 'Full Sun',
                    waterAccess: true,
                    images: [`https://storage.urbanfarming.com/spaces/plot${j}.jpg`],
                    amenities: ['water', 'electricity', 'tools', 'fencing'],
                    availability: true,
                    isApproved: true
                }
            });
        }

        // Create 10 products per vendor
        for (let k = 1; k <= 10; k++) {
            const categoryIndex = k % categories.length;
            const category = categories[categoryIndex] || 'Vegetables';

            await prisma.produce.create({
                data: {
                    vendorId: vendor.id,
                    name: `Organic ${category} ${k}`,
                    description: `Fresh, chemical-free ${category} grown with love.`,
                    price: 50 + (k * 10),
                    category: category,
                    subCategory: 'Organic',
                    images: [`https://storage.urbanfarming.com/products/produce${k}.jpg`],
                    certificationStatus: CertificationStatus.APPROVED,
                    availableQuantity: 100 + (k * 20),
                    unit: 'kg',
                    organicLabel: true,
                    harvestDate: new Date()
                }
            });
        }

        vendors.push({ id: vendor.id, farmName: vendor.farmName });
        console.log(`✅ Created vendor ${i}: ${user.name} with 10 spaces and 10 products`);
    }

    // Create customers
    const customers: { id: number; address: string | null }[] = [];
    for (let i = 1; i <= 20; i++) {
        const user = await prisma.user.create({
            data: {
                name: `Customer ${i}`,
                email: `customer${i}@example.com`,
                password: await bcrypt.hash('Customer@123', 10),
                role: Role.CUSTOMER,
                status: UserStatus.ACTIVE,
                phoneNumber: `+880172000000${i}`,
                address: `Customer Address ${i}, Dhaka`
            }
        });
        customers.push({ id: user.id, address: user.address });

        // Create plant tracking for each customer
        for (let j = 1; j <= 3; j++) {
            await prisma.plantTracking.create({
                data: {
                    userId: user.id,
                    plantName: `Tomato Plant ${j}`,
                    plantType: 'Tomato',
                    variety: 'Heirloom',
                    plantedDate: new Date(Date.now() - j * 7 * 24 * 60 * 60 * 1000),
                    expectedHarvestDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    healthStatus: HealthStatus.HEALTHY,
                    growthStage: GrowthStage.VEGETATIVE,
                    lastWatered: new Date(),
                    notes: 'Growing well, need support soon',
                    images: []
                }
            });
        }

        // Create community posts
        for (let j = 1; j <= 2; j++) {
            await prisma.communityPost.create({
                data: {
                    userId: user.id,
                    title: `My urban gardening experience ${j}`,
                    content: `I've been growing vegetables on my balcony for ${j} months now. It's amazing!`,
                    tags: ['urbanfarming', 'organic', 'balcony garden'],
                    images: [],
                    likes: Math.floor(Math.random() * 50),
                    shares: Math.floor(Math.random() * 10),
                    isApproved: true
                }
            });
        }

        console.log(`✅ Created customer ${i}: ${user.name} with plants and posts`);
    }

    // Create some orders
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
                        status: OrderStatus.COMPLETED,
                        deliveryAddress: customer.address || 'Dhaka',
                        paymentMethod: 'bkash',
                        paymentId: `PAY${Date.now()}${i}`,
                        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
                    }
                });
            }
        }
    }

    console.log(`✅ Created 50 sample orders`);

    // Create some rental bookings
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
                        status: OrderStatus.COMPLETED,
                        paymentStatus: 'paid'
                    }
                });
            }
        }
    }

    console.log(`✅ Created 30 rental bookings`);

    // Summary
    const stats = await prisma.$transaction([
        prisma.user.count(),
        prisma.vendorProfile.count(),
        prisma.produce.count(),
        prisma.rentalSpace.count(),
        prisma.communityPost.count(),
        prisma.plantTracking.count(),
        prisma.order.count(),
        prisma.rentalBooking.count()
    ]);

    console.log('\n📊 Seeding Summary:');
    console.log(`- Users: ${stats[0]}`);
    console.log(`- Vendors: ${stats[1]}`);
    console.log(`- Products: ${stats[2]}`);
    console.log(`- Rental Spaces: ${stats[3]}`);
    console.log(`- Community Posts: ${stats[4]}`);
    console.log(`- Plant Trackings: ${stats[5]}`);
    console.log(`- Orders: ${stats[6]}`);
    console.log(`- Rental Bookings: ${stats[7]}`);

    console.log('\n🎉 Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });