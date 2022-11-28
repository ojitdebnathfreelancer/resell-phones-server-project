const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { query } = require('express');
const app = express();
require('dotenv').config();

const stripe = require("stripe")(process.env.PAYMENT_KEY);

const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Resell phones server is running')
});
// default api for check  

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.r7d25w3.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const jwtVerify = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).send({ message: "You have not access token" })
    }
    const Mtoken = token.split(' ')[1];
    jwt.verify(Mtoken, process.env.ACCESS_TOKEN, (error, decoded) => {
        if (error) {
            return res.status(403).send({ message: "Your access forbiden for error" })
        }
        req.decoded = decoded;
        next()
    })
};
// jwt verification 

const resell = async () => {
    try {
        const categoryNameData = client.db('resellphones').collection('categoryName');
        const productsData = client.db('resellphones').collection('products');
        const bookingsData = client.db('resellphones').collection('bookings');
        const usersData = client.db('resellphones').collection('users');

        // app.get('/update', async (req, res) => {
        //     const filter = {};
        //     const options = { upsert: true };
        //     const updateDoc = {
        //         $set: {
        //             pay:false
        //         },
        //     };

        //     const result = await bookingsData.updateMany(filter, updateDoc, options);
        //     res.send(result);
        // })
        // any colleaciton for update funtion 

        app.get('/jwt', (req, res) => {
            const user = req.query.email;
            if (user) {
                const token = jwt.sign({ user }, process.env.ACCESS_TOKEN, { expiresIn: '1d' });
                res.send({ token });
            }
        });
        // jwt token sign to client side 

        const adminVerify = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersData.findOne(query);

            if (user?.role !== "admin") {
                return res.status(403).send('Your are not a admin, forbiden access')
            }
            next()
        };
        // admin veify 

        const sellerVerify = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersData.findOne(query);

            if (user?.role !== "seller") {
                return res.status(403).send({ message: 'Your are not a seller, forbiden access' })
            }
            next()
        };
        // seller veify 

        const buyerVerify = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersData.findOne(query);
            // console.log(email);
            if (user?.role !== "buyer") {
                return res.status(403).send('Your are not a buyer, forbiden access')
            }
            next()
        };
        // buyer veify 


        // -------------admin seller and buyer veryfid above----------------


        app.get('/user/admin/:email', jwtVerify, async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersData.findOne(query);

            res.send({ isAdmin: user?.role === 'admin' })
        });
        // check admin for privete route 

        app.get('/user/buyer/:email', jwtVerify, async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersData.findOne(query);

            res.send({ isBuyer: user?.role === 'buyer' })
        });
        // check buyer for privete route 

        app.get('/user/seller/:email', jwtVerify, async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersData.findOne(query);

            res.send({ isSeller: user?.role === 'seller' })
        });
        // check seller for privete route 

        // ---------admin seller and buyer Check for privet rout above----------


        // -----------main apis call start--------
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existUser = await usersData.findOne(query);

            if (existUser) {
                return;
            };

            const result = await usersData.insertOne(user);
            res.send(result);
        });
        // save user to bd 

        app.get('/categories', async (req, res) => {
            const categoryName = await categoryNameData.find({}).toArray();
            res.send(categoryName);
        });
        // get all category name 

        app.get('/category/:id', jwtVerify, async (req, res) => {
            const id = req.params.id;
            const query = { category_id: id, pay: false };
            const category = await productsData.find(query).toArray();
            res.send(category);
        });
        // get category ways data 

        app.post('/booking', jwtVerify, async (req, res) => {
            const booked = req.body;
            const result = await bookingsData.insertOne(booked);
            res.send(result);
        });
        // booking product save to db

        app.get('/booking', jwtVerify, async (req, res) => {
            const email = req.query.email;
            const query = { buyerEmail: email };
            const booked = await bookingsData.find(query).toArray();
            res.send(booked);
        });
        // get user all booked 

        app.delete('/bookingdelete/:id', jwtVerify, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bookingsData.deleteOne(query);
            res.send(result)
        });
        // delete single items from booking 

        app.delete('/bookingdeleteall/:email', jwtVerify, async (req, res) => {
            const email = req.params.email;
            const query = { buyerEmail: email };
            const result = await bookingsData.deleteMany(query);
            res.send(result)
        });
        // delete all items from booking 

        app.post('/addproduct', jwtVerify, async (req, res) => {
            const product = req.body;
            const result = await productsData.insertOne(product);
            res.send(result);
        })
        // add product to db 

        app.get('/myproducts', jwtVerify, async (req, res) => {
            const email = req.query.email;
            const query = { sellerEmail: email };
            const products = await productsData.find(query).toArray();
            res.send(products);
        });
        // seller all products from db 

        app.delete('/myproductdelete/:id', jwtVerify, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsData.deleteMany(query);
            res.send(result);
        });
        // my single products delete 

        app.delete('/myallproductsdelete', jwtVerify, async (req, res) => {
            const email = req.query.email;
            const query = { sellerEmail: email };
            const result = await productsData.deleteMany(query);
            res.send(result);
        });
        // my all products delete 

        app.get('/mybuyers', jwtVerify, async (req, res) => {
            const email = req.query.email;
            const query = { sellerEamil: email };
            const buyers = await bookingsData.find(query).toArray();
            res.send(buyers);
        });
        // seller of buyers from db 

        app.delete('/deletemybuyer/:id', jwtVerify, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bookingsData.deleteOne(query);
            res.send(result)
        });
        // delete signle buyer 

        app.delete('/deletemyallbuyers/:email', jwtVerify, async (req, res) => {
            const email = req.params.email;
            const query = { sellerEamil: email };
            const result = await bookingsData.deleteMany(query);
            res.send(result);
        });
        // delete all buyers 

        app.get('/allseller', jwtVerify, async (req, res) => {
            const query = { role: 'seller' };
            const sellers = await usersData.find(query).toArray();
            res.send(sellers);
        });
        // all serllers get from db 

        app.put('/sellerverify', jwtVerify, async (req, res) => {
            const email = req.query.email;
            const filter = { sellerEmail: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    seller_verify: true
                },
            };
            const verifid = await productsData.updateMany(filter, updateDoc, options);
            res.send(verifid);
        });
        // seller verify 

        app.put('/usersellerverify/:id', jwtVerify, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    seller_verify: true
                },
            };
            const userSeller = await usersData.updateOne(filter, updateDoc, options);
        });
        // user seller verifiy 

        app.delete('/sellerdelete/:id', jwtVerify, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersData.deleteOne(query);
            res.send(result);
        });
        // one seller delete 

        app.delete('/allsellerdelete', jwtVerify, async (req, res) => {
            const query = { role: 'seller' };
            const result = await usersData.deleteMany(query);
            res.send(result);
        });
        // delete all seller 

        app.get('/allbuyers', jwtVerify, async (req, res) => {
            const query = { role: 'buyer' }
            const buyer = await usersData.find(query).toArray();
            res.send(buyer);
        });
        // all buyers get form bd 

        app.delete('/buyerdelete/:id', jwtVerify, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersData.deleteOne(query);
            res.send(result);
        });
        // delete one buyer 

        app.get('/advertise', async (req, res) => {
            const query = { ads: true, pay: false };
            const adsProducts = await productsData.find(query).toArray();
            res.send(adsProducts);
        });
        // get all advertiase products 

        app.put('/advertiseon/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    ads: true
                },
            };
            const result = await productsData.updateOne(filter, updateDoc, options);
            res.send(result);
        });
        // advetise running api 

        app.get('/payment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bookingsData.findOne(query);
            res.send(result);
        });
        // payment product getting 


        app.post("/create-payment-intent", jwtVerify, async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "bdt",
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });
        // buyer payment api 

        app.put('/bookedpaymentupdate/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    pay: true
                },
            };
            const result = await bookingsData.updateOne(filter, updateDoc, options);
            res.send(result);
        });
        // booking payment update 


        app.patch('/productpaymentupdate', async (req, res) => {
            const product = req.body;
            console.log(product);
            const filter = {img:product.product_img};
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    pay: true,
                    ads: false
                },
            };
            const result = await productsData.updateOne(filter, updateDoc, options);
            res.send(result);
        });
        // products payment update

    }
    finally {

    }
};
resell().catch(error => console.error(error));


app.listen(port, () => {
    console.log('server running', port)
});
