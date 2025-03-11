require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000




//middleware
app.use(express.json())
app.use(cors())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pjwkg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection

        // DB Collection
        const userCollection = client.db('KashemDB').collection('users')
        const categoryCollection = client.db('KashemDB').collection('categories')
        const productCollection = client.db('KashemDB').collection('products')
        const bannerCollection = client.db('KashemDB').collection('banners')

        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
            res.send({ token })
        })

        //jwt middleware
        const verifyToken = (req, res, next) => {

            // console.log('inside Verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'access-unauthorized' })

            }
            const token = req.headers.authorization.split(' ')[1]
            // verify a token symmetric
            jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
                if (err) {
                    return res.status(401).send({ message: 'access-unauthorized' })
                }
                req.decoded = decoded
                next()

            });


        }



        // user collection
        app.post('/users', async (req, res) => {
            const user = req.body
            const query = { email: user.email }
            const isExist = await userCollection.findOne(query)
            if (isExist) {
                return res.send({ message: 'User already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })
        app.get('/users', async (req, res) => {
            const search = req.query.search
            const query = {}
            if (search) {
                query.name = { $regex: search, $options: "i" }
            }
            const result = await userCollection.find(query).toArray()
            res.send(result)
        })
        app.patch('/users/:id/:role', async (req, res) => {
            const id = req.params.id
            const role = req.params.role
            // console.log(role, id);
            const query = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: role
                }
            }
            const result = await userCollection.updateOne(query, updatedDoc)
            res.send(result)
        })
        app.put('/users/profile/:id', async (req, res) => {
            const id = req.params.id
            const userInfo = req.body
            if (!id || !ObjectId.isValid(id)) {

                const result = await userCollection.insertOne(userInfo);
                return res.send(result);
            }
            // console.log(id, userInfo);
            const query = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    name: userInfo.name,
                    mobile: userInfo.mobile,
                    image: userInfo.image
                }
            }
            const options = { upsert: true };
            const result = await userCollection.updateOne(query, updatedDoc, options)
            res.send(result)
        })
        app.get('/user', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const result = await userCollection.findOne(query)
            // console.log(result);
            res.send(result)
        })







        // category 

        app.post('/categories', async (req, res) => {
            const category = req.body
            const result = await categoryCollection.insertOne(category)
            res.send(result)

        })
        app.get('/categories', async (req, res) => {
            const result = await categoryCollection.find().toArray()
            res.send(result)
        })
        app.get('/category/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const result = await categoryCollection.findOne(filter)
            res.send(result)
        })

        app.patch('/category/update/:id', async (req, res) => {
            const id = req.params.id
            const data = req.body
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    name: data.name,
                    image: data.image,
                    description: data.description
                }
            }
            const result = await categoryCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })



        //  'name', 'category', 'gender', 'origin', 'caseMetal', 'caseSize', 'braceletMaterial', 'glassType', 'color', 'wr', 'price', 'status', 'description', 'image'

        // product
        app.post('/products', async (req, res) => {
            const product = req.body
            const result = await productCollection.insertOne(product)
            res.send(result)
        })
        app.get('/products', async (req, res) => {
            const search = req.query.search
            const category = req.query.category
            const query = {}
            if (search) {
                query.name = { $regex: search, $options: "i" };
            }
            if (category) {
                query.category = category

            }
            // console.log(query);
            const result = await productCollection.find(query).sort({ _id: -1 }).toArray()
            res.send(result);
        })

        app.delete('/product/delete/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const result = await productCollection.deleteOne(filter)
            res.send(result)
        })
        app.patch('/product/update/:id', async (req, res) => {
            const id = req.params.id
            const product = req.body
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {

                    name: product.name,
                    category: product.category,
                    gender: product.gender,
                    origin: product.origin,
                    caseMetal: product.caseMetal,
                    caseSize: product.caseSize,
                    braceletMaterial: product.braceletMaterial,
                    glassType: product.glassType,
                    color: product.color,
                    wr: product.wr,
                    price: product.price,
                    status: product.status,
                    description: product.description,
                    image: product.image,
                    warranty: product.warranty,
                    frameType: product.frameType,
                    frameMaterial: product.frameMaterial,
                    frameSize: product.frameSize,
                    prescription: product.prescription,
                    lensMaterial: product.lensMaterial,
                    dimensions: product.dimensions,
                }
            }
            const result = await productCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })




        // Banner Management
        app.post('/banners', async (req, res) => {
            const banner = req.body
            const result = await bannerCollection.insertOne(banner)
            res.send(result)
        })
        app.get('/banners', async (req, res) => {
            const result = await bannerCollection.aggregate([{ $sample: { size: await bannerCollection.countDocuments() } }]).toArray();
            res.send(result);
        });
        app.patch('/banner/status/:id', async (req, res) => {
            const id = req.params.id
            const { status } = req.body
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    status: status
                }
            }
            // console.log(status);
            const result = await bannerCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })
        app.delete('/banner/delete/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const result = await bannerCollection.deleteOne(filter)
            res.send(result)
        })






        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', async (req, res) => {
    res.send('kashem optics server is running')
})
app.listen(port, () => {
    console.log('server running on: ', port);
})
