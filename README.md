# bom-three.js (THREE.BOMLoader)
A javascript library to import BOM (Binary Object/Material) files into three.js.  Loaded assets will be output as a THREE.Mesh
consisting of THREE.BufferGeometry and an associated THREE.Material.  Multi-material assets may be split into multiple THREE.Mesh objects, per material.

## Usage
Include the loader library in your project:
```html
<script src="https://cdn.rawgit.com/NGenesis/bom-three.js/v0.3/examples/js/loaders/BOMLoader.min.js"></script>
```

Then create an instance of BOMLoader and specify the file path to load:
### Javascript
```javascript
var filePath = 'https://example.com/path/to/file.bom';

var loader = new THREE.BOMLoader();
//loader.setDebug(true); // Output verbose debugging information (Disabled/false by default)
//loader.setPerfTimer(true); // Output loader performance timer information (Disabled/false by default)
loader.setTexturePath(filePath.split('/').slice(0, -1).join('/') + '/'); // Specify base texture path

loader.load(filePath, function(obj) {
	scene.add(obj); // Add object to scene once loaded.
});
```

## See also
[obj2bom](https://github.com/NGenesis/bom-obj2bom) - A command line tool to convert OBJ and associated MTL files to BOM (Binary Object/Material) file format.
