require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000




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

//middleware
app.use(express.json())
app.use(cors())