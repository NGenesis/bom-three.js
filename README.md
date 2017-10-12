# bom-three.js (THREE.BOMLoader)
A javascript library to import BOM (Binary Object/Material) files into three.js.  Loaded assets will be output as a THREE.Mesh
consisting of THREE.BufferGeometry and an associated THREE.Material.  Multi-material assets may be split into multiple THREE.Mesh objects, per material.

## Usage
Include the loader library in your project:
```html
<script src="https://cdn.rawgit.com/NGenesis/bom-three.js/v0.5.1/examples/js/loaders/BOMLoader.min.js"></script>
```

Then create an instance of BOMLoader and specify the file path to load:
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

A convenience loader is also provided to load one or more files in the order provided:
```javascript
var filePaths = [
	{ name: 'File 1', url: 'https://example.com/path/to/file1.bom' },
	{ name: 'File 2', url: 'https://example.com/path/to/file2.bom' }
];

THREE.BOMLoaderUtil.multiload(filePaths, function(objects) {
	for(var object of objects) {
		console.log('File loaded: ', object.name);
		scene.add(object.object); // Add object to scene once loaded.
	}
});
```

## See also
[obj2bom](https://github.com/NGenesis/bom-obj2bom) - A command line tool to convert OBJ and associated MTL files to BOM (Binary Object/Material) file format.
