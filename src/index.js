import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import pkg from 'pg';
import bcrypt from 'bcrypt';
import path from 'path';
import compression from 'compression';
import { fileURLToPath } from 'url';

const { Pool } = pkg;

// Define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({path: __dirname+'/../.env' });

const app = express();
const port = process.env.PORT || 3000;
const dbURL = process.env.DATABASE_URL;


const allowedOrigins = [process.env.CORS_ORIGIN];
const corsOption = {
    origin: (origin, callback) => {
        if( !origin || allowedOrigins.includes(origin)){
            callback(null, true);
        }
        else{
            callback(new Error("Not Allowed (Cors)"));
        }
    },
    // credentials: true,
    optionsSuccessStatus: 200,
};

app.set('env', process.env.NODE_ENV || 'development');
app.disable('x-powered-by');
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(cors(corsOption));
app.use(express.json());
app.use(compression())

//For hashing passwords
const saltRounds = 5;

//PostgreSQL connection
const pg = new Pool({
    connectionString: dbURL,
});

//Testing Connection
pg.connect((err) => {
    if (err) console.log('Database connection error: ', err);
    else console.log('Connected to PostgreSQL');
});

//Get Inventory Data
app.get('/api', async (req, res) => {
    try{
        const data = await pg.query('SELECT id, product_name, category , price, sku, dimensions, status FROM Inventory');
        res.json(data.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/api/product/:id', async (req, res) => {
    try{

        const result = await pg.query('SELECT id, product_name, category, price, sku, supplier, dimensions, status from Inventory WHERE id = $1',[req.params.id]);
        
        if (result.rows.length === 0){
            return res.status(404).json({ message: "Product Not Found."})
        }

        console.log('object: ', result.rows[0])

        // Send response
        res.json({ message: 'Received', value: result.rows[0] });
    }
    catch (err) {
        console.error(err)
        res.status(500).send('Server Error')
    }
});

app.post('/api/product/', async (req, res) => {
    try{
        const { keys } = req.body;

        if(!Array.isArray(keys)){
            return res.status(400).json({message: "error with array"});
        }
        const query = `SELECT id, product_name, category, price, sku, supplier, dimensions, status from Inventory WHERE id = ANY($1)`;  

        const result = await pg.query(query, [keys]);

        const productData = {};

        result.rows.forEach( (row) => {
            productData[row.id] = row;
        })

        res.json( result.rows )

    }
    catch(err){
        console.error(err)
    }
});


app.post('/api/users/', async (req,res) => {
    try{
        console.log(req.body);
        const { username, email, password } = req.body;
        const errors = {}
        const emailRegex = /^[a-zA-Z0-9.+-_]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const passwordRegex = /^[a-zA-z0-9!#@%\$\&]+$/;

   
        if(!username){
            console.log("Username is empty.")
            return res.status(400).json({ error: "Username field is empty."})
        }

        if(!email){
            if(!emailRegex.test(email)){
                errors.email = "Email not valid."
                return res.status(400).json({ error: "Email did not match format", errors})
            }
            errors.email = "Email is empty."
            return res.status(400).json({ error: "Email field is empty.", errors})
            
        }

        if(!password){
            if(!passwordRegex.test(password)){
                errors.password = "Password not valid."
                return res.status(400).json({ error: "Password did not match regex"}, errors)
            }
            errors.password = "Password empty."
            return res.status(400).json({ error: "Password field is empty.", errors})
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const userInfoQuery = "INSERT INTO usersdb(username, email, password) VALUES ($1, $2, $3)";
        const result = await pg.query(userInfoQuery, [username, email, hashedPassword]);

        console.log("User Added: ", result.rows[0]);
        res.status(200).json({ message: "User Added:", user: result.rows[0]})
    }
    catch(err){
        console.error(err);
        if (err.code === '23505') {
            res.status(409).json({ errors: { email: 'Email or username already exists' } });
        } else {
            res.status(500).json({ error: 'Database Error: User Insert Error'});
        }
    }
})

app.post('/api/login/', async (req,res) => {
    try{
        const {username, password} = req.body;
    
        console.log(username);
        console.log(password);

        if(!username || !password ){
            console.log("Username and password are required.");
            return res.status(400).json({ error: "Username and Password field is empty."})
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const userInfoInput = "SELECT username, password FROM usersdb WHERE username = $1";
        const result = await pg.query(userInfoInput, [username]);   
        
        if( result.rows.length > 0 ){
            const verifyPassword = result.rows[0].password;
            const isMatch = await bcrypt.compare(password, verifyPassword);
            if(isMatch){
                res.status(200).json({ message: "Login successful."})
            }
            else{
                res.status(401).json({ message: "Username or password were incorrect."})
            }
        }
        else{
            res.status(401).json({ error: 'Invalid username and password.'});
        }
    }
    catch(err){

        console.error("Look up error.", err);
        res.status(500).json({error: 'Server error.'});
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

app.use(express.static(path.join(__dirname, '../dist')));

app.listen(port, () => {
    console.log('Server running on port 3000');
});