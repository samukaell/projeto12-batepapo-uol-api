import chalk from 'chalk';
import express,{json} from 'express';
import cors from 'cors'
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';


const app = express();
app.use(json());                    
app.use(cors());    


dotenv.config();
//BANCO DE DADOS
let database = null;
const mongoClient = new MongoClient(process.env.MONGO_URL);//mongodb://127.0.0.1:27017 
const promise = mongoClient.connect();
promise.then(response => {
    database = mongoClient.db("uol");
    console.log(chalk.blue.bold("O banco de dados (mensagens) esta no ar!!!"))
});
promise.catch(err=>{
    console.log(chalk.red.bold("Eita deu ruim aqui no banco de dados ->"),err);
})


//Variaveis tempo
const date = new Date().toLocaleTimeString();

//FIXME
let participantes = [{name:"Sam"}];

//Participantes
app.get("/participants", (req,res)=>{
    //Banco
    const promise = database.collection("participantes").find({}).toArray();
    promise.then((participantes) => {
        res.send(participantes);  
    });
    promise.catch(err=>{
        console.log(chalk.red.bold("Deu ruim, não foi possivel ver os participantes deste chat",err));
        res.sendStatus(500);
    });

});

app.post("/participants",async (req,res)=>{
    const {name} = req.body;
    if(name == ""){
        res.status(422).send("O nome não pode ser vazio");
    }else{
        try{
            //Esta vazio?
            const participanetes = await database.collection("participantes").findOne({});
            if(participanetes==null){
                const cadastrar = await database.collection("participantes").insertOne({name:name, lastStatus: Date.now()})
                res.status(200).send("O nome foi cadastrado :3");
            //Se nao esta vazio
            }else{
                //Procurando nome  
                let user = await database.collection("participantes").findOne({name:name})
                console.log("existe->",user);

                if(user == null){
                    await database.collection("participantes").insertOne({name:name, lastStatus: Date.now()})
                    console.log("Cadastrou!");
                    res.status(200).send("BORA!");
                }else{
                    console.log("Tem gente logada com esse nome");
                    res.status(409).send("Puts, num deu!");
                }
            }
        }catch(err){
            console.log(chalk.bold.red("Erro ao tentar cadastrar o participante", err));
            res.status(500).send("Ops, problema no cadastro do participanete :(");
        }
    }
    
});

//Mensagens
app.get("/messages", (req,res)=>{
    const {limit} = req.query;

    //Banco
    const promise = database.collection("mensagens").find({}).toArray();
    promise.then((mensagens) => {
        if(limit != undefined && limit != null){
            res.send([...mensagens].reverse().slice(0,limit));
        }else{
            res.send([...mensagens].reverse());
        }
    });
    promise.catch(err=>{
        console.log(chalk.red.bold("Deu ruim no carregamento das mensagens->",err));
        res.sendStatus(500);
    });
    
});
app.post("/messages",async(req,res)=>{
    const {to,text,type} = req.body;
    const {user} = req.headers;

    try{
        let usuario = await database.collection("participantes").findOne({name:user});
        console.log("O usuario",usuario," postou!");

        if(usuario != null){
            if(to != "" && text != "" && (type == 'message' || type == 'private_message')){
            
                console.log("Para->",to,"Texto->",text,"tipo->",type,"Hoje->");
        
                let objetoMensagem = {
                    from: user, to: to, text: text, type: type, time: date
                }
        
                //Banco
                const promise = database.collection("mensagens").insertOne(objetoMensagem);
                promise.then((confirmacao)=>{
                    console.log("BD confirmaçao ->",confirmacao);
                    res.sendStatus(201);
                });
                promise.catch(err=>{
                    console.log(chalk.red.bold("Deu ruim no post->",err));
                    res.sendStatus(500);
                })
        
                
            }else{
                res.status(422).send("O post esta zuado");
            }
        }else{
            console.log(chalk.bold.red("Erro na atualização do participante", err));
            res.status(404).send("Participante não esta logado");
        }
        

    }catch(err){
        console.log(chalk.bold.red("Erro na atualização do participante", err));
        res.status(404).send("Participante não esta logado");
    }
})

//Status
app.post("/status", async (req, res) =>{
    const header = req.headers;
    const user = header.user;

    try{
        let usuario = await database.collection("participantes").findOne({name:user});
        if(usuario != null){
            console.log("Ainda presente o usuario",usuario);
            await database.collection("participantes").updateOne({ 
                _id: usuario._id 
            }, { $set: {
                lastStatus: Date.now()
            }})
            res.status(200).send("Ok");
        }else{
            res.status(404).send("Participante não esta logado");
        }

    }catch(err){
        console.log(chalk.bold.red("Erro na atualização do participante", err));
        res.status(404).send("Participante não esta logado");
    }
    
})

//Remover da sala
async function desconectarUsuarios(){
    let time = Date.now();
    try{
        const excluidos = await database.collection("participantes").deleteMany({lastStatus: {$lt:time - 10000}});
        const participanetes = await database.collection("participantes").find({}).toArray();
        
        console.log("Excluidos->", excluidos);
        console.log("Date now atual ->",time);
        console.log("Lista de participantes->", participanetes);

    }catch(err){
        console.log(chalk.bold.red("Erro na lista de participantes", err));
    }

}

//Deslogar usuarios
setInterval(desconectarUsuarios,15000)

app.listen(5000, () => {
    console.log(chalk.bold.green(`Servidor ar na porta 5000`))
});