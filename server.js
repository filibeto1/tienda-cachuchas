const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Configurar multer para subir imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Asegurar que las carpetas existen
if (!fs.existsSync('data')) fs.mkdirSync('data');
if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

// Leer/Grabar datos
function leerData(archivo) {
    try {
        return JSON.parse(fs.readFileSync(`data/${archivo}.json`, 'utf8'));
    } catch {
        return [];
    }
}

function guardarData(archivo, data) {
    fs.writeFileSync(`data/${archivo}.json`, JSON.stringify(data, null, 2));
}

// ============ API RUTAS ============

// Obtener colecciones
app.get('/api/colecciones', (req, res) => {
    res.json(leerData('colecciones'));
});

// Crear colección
app.post('/api/colecciones', (req, res) => {
    const colecciones = leerData('colecciones');
    const nueva = { id: Date.now(), nombre: req.body.nombre };
    colecciones.push(nueva);
    guardarData('colecciones', colecciones);
    res.json(nueva);
});

// Eliminar colección
app.delete('/api/colecciones/:id', (req, res) => {
    let colecciones = leerData('colecciones');
    colecciones = colecciones.filter(c => c.id != req.params.id);
    guardarData('colecciones', colecciones);
    res.json({ success: true });
});

// Obtener productos
app.get('/api/productos', (req, res) => {
    res.json(leerData('productos'));
});

// Crear producto con imágenes y stock por talla
app.post('/api/productos', upload.array('imagenes', 20), (req, res) => {
    const productos = leerData('productos');
    const imagenesPaths = req.files.map(f => `/uploads/${f.filename}`);
    
    // Parsear tallasStock desde JSON string
    let tallasStock = {};
    if (req.body.tallasStock) {
        try {
            tallasStock = JSON.parse(req.body.tallasStock);
        } catch(e) {
            tallasStock = {};
        }
    }
    
    const nuevoProducto = {
        id: Date.now(),
        coleccionId: parseInt(req.body.coleccionId),
        nombre: req.body.nombre,
        precio: parseFloat(req.body.precio),
        tallasStock: tallasStock,
        imagenes: imagenesPaths
    };
    
    productos.push(nuevoProducto);
    guardarData('productos', productos);
    res.json(nuevoProducto);
});

// ============ RUTA PARA ACTUALIZAR PRODUCTO (PUT) ============
app.put('/api/productos/:id', (req, res) => {
    let productos = leerData('productos');
    const id = parseInt(req.params.id);
    const index = productos.findIndex(p => p.id === id);
    
    if (index !== -1) {
        // Actualizar el producto manteniendo el mismo ID
        productos[index] = {
            ...req.body,
            id: id  // Asegurar que el ID no cambie
        };
        guardarData('productos', productos);
        res.json(productos[index]);
    } else {
        res.status(404).json({ error: 'Producto no encontrado' });
    }
});

// ============ RUTA PARA SUBIR IMÁGENES ADICIONALES ============
app.post('/api/upload-imagenes', upload.array('imagenes', 20), (req, res) => {
    const imagenesPaths = req.files.map(f => `/uploads/${f.filename}`);
    res.json({ imagenes: imagenesPaths });
});

// ============ RUTA PARA ACTUALIZAR STOCK ============
app.put('/api/productos/:id/stock', (req, res) => {
    const productos = leerData('productos');
    const id = parseInt(req.params.id);
    const index = productos.findIndex(p => p.id === id);
    
    if (index !== -1) {
        productos[index].cantidad = req.body.cantidad;
        guardarData('productos', productos);
        res.json(productos[index]);
    } else {
        res.status(404).json({ error: 'Producto no encontrado' });
    }
});

// ============ RUTA PARA ELIMINAR PRODUCTO ============
app.delete('/api/productos/:id', (req, res) => {
    let productos = leerData('productos');
    const id = parseInt(req.params.id);
    const producto = productos.find(p => p.id === id);
    
    // Eliminar imágenes físicas
    if (producto && producto.imagenes) {
        producto.imagenes.forEach(img => {
            const filepath = path.join(__dirname, 'public', img);
            if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        });
    }
    
    productos = productos.filter(p => p.id !== id);
    guardarData('productos', productos);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📱 Tienda: http://localhost:${PORT}/index.html`);
    console.log(`👑 Admin: http://localhost:${PORT}/admin.html`);
});