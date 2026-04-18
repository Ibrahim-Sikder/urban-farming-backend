
import { PrismaClient, Role, UserStatus, CertificationStatus, OrderStatus, HealthStatus, GrowthStage } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log(' Starting seeding...');

    try {

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
        console.log(` Created admin: ${admin.email}`);

        // 2. Create 10 Vendors
        const vendors: { id: number; farmName: string }[] = [];
        const categories = ['Vegetables', 'Fruits', 'Herbs', 'Microgreens', 'Mushrooms'];

        console.log(' Creating 10 vendors...');
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
                    farmLocation: JSON.stringify({
                        lat: 23.8103 + (i * 0.01),
                        lng: 90.4125 + (i * 0.01),
                        address: `Dhaka, Bangladesh`
                    }),
                    certificationStatus: CertificationStatus.APPROVED,
                }
            });

            await prisma.sustainabilityCert.create({
                data: {
                    vendorId: vendor.id,
                    certifyingAgency: 'Bangladesh Organic Certification Body',
                    certificationDate: new Date(),
                    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    documentUrl: `https://storage.urbanfarming.com/certs/vendor${i}.pdf`,
                    verificationStatus: CertificationStatus.APPROVED,
                    verifiedBy: admin.id,
                    verifiedAt: new Date()
                }
            });

            for (let j = 1; j <= 10; j++) {
                await prisma.rentalSpace.create({
                    data: {
                        vendorId: vendor.id,
                        location: JSON.stringify({
                            lat: 23.8103 + (i * 0.01) + (j * 0.001),
                            lng: 90.4125 + (i * 0.01) + (j * 0.001),
                            address: `Plot ${j}, Dhaka`
                        }),
                        size: j * 50,
                        price: 2000 + (j * 200),
                        availability: true
                    }
                });
            }

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
                        certificationStatus: CertificationStatus.APPROVED,
                        availableQuantity: 100 + (k * 20),
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
                    role: Role.CUSTOMER,
                    status: UserStatus.ACTIVE,
                    phoneNumber: `+880172000000${i}`,
                    address: `Customer Address ${i}, Dhaka`
                }
            });
            customers.push({ id: user.id, address: user.address });

            for (let j = 1; j <= 3; j++) {
                await prisma.plantTracking.create({
                    data: {
                        userId: user.id,
                        plantName: `Tomato Plant ${j}`,
                        plantType: 'Tomato',
                        plantedDate: new Date(Date.now() - j * 7 * 24 * 60 * 60 * 1000),
                        expectedHarvestDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        healthStatus: HealthStatus.HEALTHY,
                        growthStage: GrowthStage.VEGETATIVE,
                        notes: 'Growing well'
                    }
                });
            }


            for (let j = 1; j <= 2; j++) {
                await prisma.communityPost.create({
                    data: {
                        userId: user.id,
                        postContent: `I've been growing vegetables on my balcony for ${j} months. This is my experience with urban farming. #urbanfarming #organic`
                    }
                });
            }

        }


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
                            totalPrice: produce.price * (Math.floor(Math.random() * 5) + 1),
                            status: OrderStatus.COMPLETED,
                            orderDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
                        }
                    });
                }
            }
            if (i % 10 === 0) console.log(`   Created ${i}/50 orders`);
        }


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
                            status: OrderStatus.COMPLETED,
                            orderDate: new Date()
                        }
                    });
                }
            }
            if (i % 10 === 0) console.log(`   Created ${i}/30 bookings`);
        }


        console.log(' Creating comments for community posts...');
        const posts = await prisma.communityPost.findMany();
        const users = await prisma.user.findMany({ where: { role: Role.CUSTOMER } });

        for (let i = 0; i < 50 && i < posts.length; i++) {
            const post = posts[i];
            const randomUser = users[Math.floor(Math.random() * users.length)];

            if (post && randomUser) {
                await prisma.communityComment.create({
                    data: {
                        postId: post.id,
                        userId: randomUser.id,
                        content: `Great post! Thanks for sharing your experience. 👍`
                    }
                });
            }
        }

        const userCount = await prisma.user.count();
        const vendorCount = await prisma.vendorProfile.count();
        const productCount = await prisma.produce.count();
        const rentalSpaceCount = await prisma.rentalSpace.count();
        const postCount = await prisma.communityPost.count();
        const commentCount = await prisma.communityComment.count();

        console.log('\n Seeding Summary:');
        console.log(` Roles: ADMIN, VENDOR, CUSTOMER (3 roles)`);
        console.log(` Total Users: ${userCount}`);
        console.log(` Vendors: ${vendorCount} (10 - as required)`);
        console.log(` Products: ${productCount} (100 - as required)`);
        console.log(` Rental Spaces: ${rentalSpaceCount} (100)`);
        console.log(` Community Posts: ${postCount}`);
        console.log(` Comments: ${commentCount}`);
        console.log('\n Seeding completed successfully!');

    } catch (error) {
        console.error(' Seeding failed:', error);
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