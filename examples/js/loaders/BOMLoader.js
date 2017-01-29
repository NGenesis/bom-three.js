/**
 * BOM (Binary Object/Material) provides a subset of Wavefront OBJ and MTL functionality to
 * load indexed triangulated geometry and basic materials from a compact binary representation.
 *
 * @author Genesis / https://github.com/NGenesis/
 */

THREE.BOMLoader = function ( manager ) {

	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

};

THREE.BOMLoader.prototype = {

	constructor: THREE.BOMLoader,

	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var loader = THREE.FileLoader ? new THREE.FileLoader( this.manager ) : new THREE.XHRLoader( this.manager );
		loader.setPath( this.path );
		loader.setResponseType( 'arraybuffer' );
		loader.load( url, function ( buffer ) {

			onLoad( scope.parse( buffer ) );

		}, onProgress, onError );

	},

	setPath: function ( value ) {

		this.path = value;

	},

	setTexturePath: function ( value ) {

		this.texturePath = value;

	},

	setCrossOrigin: function ( value ) {

		this.crossOrigin = value;

	},

	setDebug: function ( value ) {

		this.debug = value;

	},

	setPerfTimer: function ( value ) {

		this.performanceTimer = value;

	},

	setResponseType: function ( value ) {

		this.responseType = value;

	},

	parse: function ( buffer ) {

		if ( this.performanceTimer ) console.time( 'BOMLoader' );

		var FaceCulling = {

			NONE: 0,
			FRONT: 1,
			BACK: 2,
			ALL: 3

		},

		FileDataAttribute = {

			NONE: 1 << 0,
			MATERIAL_LIBRARY: 1 << 1

		},

		AssetDataAttribute = {

			NONE: 1 << 0,
			NAME: 1 << 1

		},

		GroupDataAttribute = {

			NONE: 1 << 0,
			NAME: 1 << 1,
			INDEX: 1 << 2,
			SMOOTHING: 1 << 3,
			MATERIAL: 1 << 4

		},

		ObjectDataAttribute = {

			NONE: 1 << 0,
			GEOMETRY: 1 << 1

		},

		GeometryDataAttribute = {

			NONE: 1 << 0,
			NORMAL: 1 << 1,
			UV: 1 << 2

		},

		MaterialDataAttribute = {

			NONE: 1 << 0,
			ILLUMINATION_MODEL: 1 << 1,
			SPECULAR_EXPONENT: 1 << 2,
			OPTICAL_DENSITY: 1 << 3,
			DISSOLVE: 1 << 4,
			TRANSMISSION_FILTER: 1 << 5,
			AMBIENT_REFLECTANCE: 1 << 6,
			DIFFUSE_REFLECTANCE: 1 << 7,
			SPECULAR_REFLECTANCE: 1 << 8,
			EMISSIVE_REFLECTANCE: 1 << 9,
			AMBIENT_MAP: 1 << 10,
			DIFFUSE_MAP: 1 << 11,
			SPECULAR_MAP: 1 << 12,
			EMISSIVE_MAP: 1 << 13,
			DISSOLVE_MAP: 1 << 14,
			BUMP_MAP: 1 << 15,
			DISPLACEMENT_MAP: 1 << 16,
			FACE_CULLING: 1 << 17

		},

		MapDataAttribute = {

			NONE: 1 << 0,
			PATH: 1 << 1,
			SCALE: 1 << 2,
			OFFSET: 1 << 3,
			BUMP_SCALE: 1 << 4,
			DISPLACEMENT_SCALE: 1 << 5

		};

		var view = new DataView( buffer ), pos = 0, isAssetArray = ( this.responseType === 'array' ), assets = ( isAssetArray ? [] : new THREE.Group() );

		function readUint8 () {

			var value = view.getUint8( pos );
			pos += Uint8Array.BYTES_PER_ELEMENT;
			return value;

		}

		function readUint16 () {

			var value = view.getUint16( pos, true );
			pos += Uint16Array.BYTES_PER_ELEMENT;
			return value;

		}

		function readUint32 () {

			var value = view.getUint32( pos, true );
			pos += Uint32Array.BYTES_PER_ELEMENT;
			return value;

		}

		function readFloat32 () {

			var value = view.getFloat32( pos, true );
			pos += Float32Array.BYTES_PER_ELEMENT;
			return value;

		}

		function readString ( length ) {

			var value = String.fromCharCode.apply( null, ( length > 0 ) ? new Uint8Array( view.buffer, pos, length ) : new Uint8Array() );
			pos += Uint8Array.BYTES_PER_ELEMENT * length;
			return value;

		}

		function readUint16Array ( length ) {

			if ( ( pos % Uint16Array.BYTES_PER_ELEMENT ) === 0 ) {

				// Aligned Access
				var value = new Uint16Array( view.buffer, pos, length );
				pos += Uint16Array.BYTES_PER_ELEMENT * length;
				return value;

			}

			// Unaligned Access
			var value = new Uint16Array( length );
			for ( var i = 0; i < length; ++i, pos += Uint16Array.BYTES_PER_ELEMENT ) value[ i ] = view.getUint16( pos, true );
			return value;

		}

		function readFloat32Array ( length ) {

			if ( ( pos % Float32Array.BYTES_PER_ELEMENT ) === 0 ) {

				// Aligned Access
				var value = new Float32Array( view.buffer, pos, length );
				pos += Float32Array.BYTES_PER_ELEMENT * length;
				return value;

			}

			// Unaligned Access
			var value = new Float32Array( length );
			for ( var i = 0; i < length; ++i, pos += Float32Array.BYTES_PER_ELEMENT ) value[ i ] = view.getFloat32( pos, true );
			return value;

		}

		var scope = this;

		function resolveURL ( url ) {

			if ( typeof url !== 'string' || url === '' ) return '';

			// Absolute URL
			if ( /^https?:\/\//i.test( url ) ) return url;

			var absoluteUrl = new URL(( scope.texturePath || scope.path || '' ) + url, location.href.substring( 0, location.href.lastIndexOf( '/' ) + 1 ));
			return absoluteUrl.toString();

		}

		function loadTexture ( url ) {

			url = resolveURL( url );
			var texture;

			if ( altspace && altspace.inClient ) {

				// Defer Texture Image Loading To Native Altspace Client
				texture = new THREE.Texture( { src: url } );

			} else {

				var loader = THREE.Loader.Handlers.get( url );
				if ( loader === null ) loader = new THREE.TextureLoader( scope.manager );
				loader.setCrossOrigin( scope.crossOrigin );
				texture = loader.load( url );

			}

			texture.side = THREE.FrontSide;
			texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

			return texture;

		}

		// File Signature
		var fileSignature = readString( 3 );
		if ( this.debug ) console.log( 'File Signature', fileSignature );

		// Version
		var version = readUint8();
		if ( this.debug ) console.log( 'Version', version );

		// File Data Attributes
		var fileAttributes = readUint16();
		if ( this.debug ) {

			console.log(

				'FileAttributes:', '\n',
				'Material Library', ( objectAttributes & FileDataAttribute.MATERIAL_LIBRARY ) ? true : false

			);

		}

		// Materials
		var materials = [];
		if ( fileAttributes & FileDataAttribute.MATERIAL_LIBRARY ) {

			// Material Count
			var materialCount = readUint16();
			if ( this.debug ) console.log( 'Material Count', materialCount );

			for ( var i = 0; i < materialCount; ++i ) {

				// Material Data Attributes
				var materialAttributes = readUint32();
				if ( this.debug ) {

					console.log(

						'MaterialAttributes:', '\n',
						'Illumination Model', ( materialAttributes & MaterialDataAttribute.ILLUMINATION_MODEL ) ? true : false, '\n',
						'Specular Exponent', ( materialAttributes & MaterialDataAttribute.SPECULAR_EXPONENT ) ? true : false, '\n',
						'Optical Density', ( materialAttributes & MaterialDataAttribute.OPTICAL_DENSITY ) ? true : false, '\n',
						'Dissolve', ( materialAttributes & MaterialDataAttribute.DISSOLVE ) ? true : false, '\n',
						'Transmission Filter', ( materialAttributes & MaterialDataAttribute.TRANSMISSION_FILTER ) ? true : false, '\n',
						'Ambient Reflectance', ( materialAttributes & MaterialDataAttribute.AMBIENT_REFLECTANCE ) ? true : false, '\n',
						'Diffuse Reflectance', ( materialAttributes & MaterialDataAttribute.DIFFUSE_REFLECTANCE ) ? true : false, '\n',
						'Specular Reflectance', ( materialAttributes & MaterialDataAttribute.SPECULAR_REFLECTANCE ) ? true : false, '\n',
						'Ambient Map', ( materialAttributes & MaterialDataAttribute.AMBIENT_MAP ) ? true : false, '\n',
						'Diffuse Map', ( materialAttributes & MaterialDataAttribute.DIFFUSE_MAP ) ? true : false, '\n',
						'Specular Map', ( materialAttributes & MaterialDataAttribute.SPECULAR_MAP ) ? true : false, '\n',
						'Dissolve Map', ( materialAttributes & MaterialDataAttribute.DISSOLVE_MAP ) ? true : false, '\n',
						'Bump Map', ( materialAttributes & MaterialDataAttribute.BUMP_MAP ) ? true : false, '\n',
						'Displacement Map', ( materialAttributes & MaterialDataAttribute.DISPLACEMENT_MAP ) ? true : false, '\n',
						'Face Culling', ( materialAttributes & MaterialDataAttribute.FACE_CULLING ) ? true : false

					);

				}

				var params = {};

				// Material Name
				params.name = readString( readUint16() );
				if ( this.debug ) console.log( 'Material Name', params.name );

				// Illumination Model (illum)
				if ( materialAttributes & MaterialDataAttribute.ILLUMINATION_MODEL ) {

					readUint8();
					// Not supported

				}

				// Specular Exponent (Ns)
				if ( materialAttributes & MaterialDataAttribute.SPECULAR_EXPONENT ) {

					params.shininess = readFloat32();
					if ( this.debug ) console.log( 'Specular Exponent', params.shininess );

				}

				// Optical Density (Ni)
				if ( materialAttributes & MaterialDataAttribute.OPTICAL_DENSITY ) {

					readFloat32();
					// Not supported

				}

				// Dissolve (d / [1 - Tr])
				if ( materialAttributes & MaterialDataAttribute.DISSOLVE ) {

					params.opacity = readFloat32();
					params.transparent = true;
					if ( this.debug ) console.log( 'Dissolve', params.opacity );

				}

				// Transmission Filter (Tf)
				if ( materialAttributes & MaterialDataAttribute.TRANSMISSION_FILTER ) {

					readFloat32(), readFloat32(), readFloat32();
					// Not supported

				}

				// Ambient Reflectance (Ka)
				if ( materialAttributes & MaterialDataAttribute.AMBIENT_REFLECTANCE ) {

					readFloat32(), readFloat32(), readFloat32();
					// Assumes ambient and diffuse are linked

				}

				// Diffuse Reflectance (Kd)
				if ( materialAttributes & MaterialDataAttribute.DIFFUSE_REFLECTANCE ) {

					params.color = new THREE.Color( readFloat32(), readFloat32(), readFloat32() );
					if ( this.debug ) console.log( 'Diffuse Reflectance', params.color );

				}

				// Specular Reflectance (Ks)
				if ( materialAttributes & MaterialDataAttribute.SPECULAR_REFLECTANCE ) {

					params.specular = new THREE.Color( readFloat32(), readFloat32(), readFloat32() );
					if ( this.debug ) console.log( 'Specular Reflectance', params.specular );

				}

				// Emissive Reflectance (Ke)
				if ( materialAttributes & MaterialDataAttribute.EMISSIVE_REFLECTANCE ) {

					params.emissive = new THREE.Color( readFloat32(), readFloat32(), readFloat32() );
					if ( this.debug ) console.log( 'Emissive Reflectance', params.emissive );

				}

				// Ambient Map (map_Ka)
				if ( materialAttributes & MaterialDataAttribute.AMBIENT_MAP ) {

					var mapDataAttributes = readUint16();
					if ( mapDataAttributes & MapDataAttribute.PATH ) readString( readUint16() );
					if ( mapDataAttributes & MapDataAttribute.SCALE ) readFloat32(), readFloat32();
					if ( mapDataAttributes & MapDataAttribute.OFFSET ) readFloat32(), readFloat32();
					// Assumes ambient and diffuse are linked

				}

				// Diffuse Map (map_Kd)
				if ( materialAttributes & MaterialDataAttribute.DIFFUSE_MAP ) {

					var mapDataAttributes = readUint16();
					var map = loadTexture( ( mapDataAttributes & MapDataAttribute.PATH ) ? readString( readUint16() ) : '' );
					if ( mapDataAttributes & MapDataAttribute.SCALE ) map.repeat.set( readFloat32(), readFloat32() );
					if ( mapDataAttributes & MapDataAttribute.OFFSET ) map.offset.set( readFloat32(), readFloat32() );
					params.map = map;
					if ( this.debug && ( mapDataAttributes & MapDataAttribute.PATH ) ) console.log( 'Diffuse Map', map );

				}

				// Specular Map (map_Ks)
				if ( materialAttributes & MaterialDataAttribute.SPECULAR_MAP ) {

					var mapDataAttributes = readUint16();
					var map = loadTexture( ( mapDataAttributes & MapDataAttribute.PATH ) ? readString( readUint16() ) : '' );
					if ( mapDataAttributes & MapDataAttribute.SCALE ) map.repeat.set( readFloat32(), readFloat32() );
					if ( mapDataAttributes & MapDataAttribute.OFFSET ) map.offset.set( readFloat32(), readFloat32() );
					params.specularMap = map;

				}

				// Emissive Map (map_Ke)
				if ( materialAttributes & MaterialDataAttribute.EMISSIVE_MAP ) {

					var mapDataAttributes = readUint16();
					var map = loadTexture( ( mapDataAttributes & MapDataAttribute.PATH ) ? readString( readUint16() ) : '' );
					if ( mapDataAttributes & MapDataAttribute.SCALE ) map.repeat.set( readFloat32(), readFloat32() );
					if ( mapDataAttributes & MapDataAttribute.OFFSET ) map.offset.set( readFloat32(), readFloat32() );
					params.emissiveMap = map;

				}

				// Dissolve Map (map_d)
				if ( materialAttributes & MaterialDataAttribute.DISSOLVE_MAP ) {

					var mapDataAttributes = readUint16();
					var map = loadTexture( ( mapDataAttributes & MapDataAttribute.PATH ) ? readString( readUint16() ) : '' );
					if ( mapDataAttributes & MapDataAttribute.SCALE ) map.repeat.set( readFloat32(), readFloat32() );
					if ( mapDataAttributes & MapDataAttribute.OFFSET ) map.offset.set( readFloat32(), readFloat32() );
					params.alphaMap = map;
					params.transparent = true;

				}

				// Bump Map (map_bump / bump)
				if ( materialAttributes & MaterialDataAttribute.BUMP_MAP ) {

					var mapDataAttributes = readUint16();
					var map = loadTexture( ( mapDataAttributes & MapDataAttribute.PATH ) ? readString( readUint16() ) : '' );
					if ( mapDataAttributes & MapDataAttribute.SCALE ) map.repeat.set( readFloat32(), readFloat32() );
					if ( mapDataAttributes & MapDataAttribute.OFFSET ) map.offset.set( readFloat32(), readFloat32() );
					if ( mapDataAttributes & MapDataAttribute.BUMP_SCALE ) params.bumpScale = readFloat32();
					params.bumpMap = map;

				}

				// Displacement Map (map_disp / disp)
				if ( materialAttributes & MaterialDataAttribute.DISPLACEMENT_MAP ) {

					var mapDataAttributes = readUint16();
					var map = loadTexture( ( mapDataAttributes & MapDataAttribute.PATH ) ? readString( readUint16() ) : '' );
					if ( mapDataAttributes & MapDataAttribute.SCALE ) map.repeat.set( readFloat32(), readFloat32() );
					if ( mapDataAttributes & MapDataAttribute.OFFSET ) map.offset.set( readFloat32(), readFloat32() );
					if ( mapDataAttributes & MapDataAttribute.DISPLACEMENT_SCALE ) params.displacementScale = readFloat32();
					params.displacementMap = map;

				}

				// Face Culling (cull_face)
				if ( materialAttributes & MaterialDataAttribute.FACE_CULLING ) {

					var faceCulling = readUint8();
					if ( faceCulling === FaceCulling.ALL ) params.visible = false;
					else if ( faceCulling === FaceCulling.FRONT ) params.side = THREE.BackSide;
					else if ( faceCulling === FaceCulling.BACK ) params.side = THREE.FrontSide;
					else params.side = THREE.DoubleSide;

				}

				var material = new THREE.MeshPhongMaterial( params );
				materials.push( material );

			}

		}

		// Asset Count
		var assetCount = readUint16();
		if ( this.debug ) console.log( 'Asset Count', assetCount );

		for ( var a = 0; a < assetCount; ++a ) {

			// Asset Data Attributes
			var assetAttributes = readUint16();

			if ( this.debug ) {

				console.log(

					'AssetAttributes:', '\n',
					'Name', ( assetAttributes & AssetDataAttribute.NAME ) ? true : false

				);

			}

			var asset = assets;
			if ( isAssetArray ) {

				asset = new THREE.Group();
				assets.push( asset );

			}

			// Asset Name
			if ( assetAttributes & AssetDataAttribute.NAME ) {

				var assetName = readString( readUint16() );
				if ( this.debug ) console.log( 'Asset Name', assetName );
				if ( !isAssetArray ) asset.name = assetName;

			}

			// Object Count
			var objectCount = readUint16();
			if ( this.debug ) console.log( 'Object Count', objectCount );

			for ( var i = 0; i < objectCount; ++i ) {

				// Object Data Attributes
				var objectAttributes = readUint16();

				if ( this.debug ) {

					console.log(

						'ObjectAttributes:', '\n',
						'Geometry', ( objectAttributes & ObjectDataAttribute.GEOMETRY ) ? true : false

					);

				}

				var vertices = {};
				if ( objectAttributes & ObjectDataAttribute.GEOMETRY ) {

					// Geometry Data Attributes
					var geometryAttributes = readUint16();
					if ( this.debug ) {

						console.log(

							'GeometryAttributes:', '\n',
							'Normal', ( geometryAttributes & GeometryDataAttribute.NORMAL ) ? true : false, '\n',
							'UV', ( geometryAttributes & GeometryDataAttribute.UV ) ? true : false

						);

					}

					// Vertex Count
					var vertexCount = readUint32();
					if ( this.debug ) console.log( 'Vertex Count', vertexCount );

					// Vertex Positions
					vertices.positions = readFloat32Array( vertexCount * 3 );

					// Vertex Normals
					if ( geometryAttributes & GeometryDataAttribute.NORMAL ) vertices.normals = readFloat32Array( vertexCount * 3 );

					// Vertex UVs
					if ( geometryAttributes & GeometryDataAttribute.UV ) vertices.uvs = readFloat32Array( vertexCount * 2 );

				}

				// Group Count
				var groupCount = readUint16();
				if ( this.debug ) console.log( 'Group Count', groupCount );

				for ( var j = 0; j < groupCount; ++j ) {

					// Group Data Attributes
					var groupAttributes = readUint16();
					if ( this.debug ) {

						console.log(

							'GroupAttributes:', '\n',
							'Index', ( groupAttributes & GroupDataAttribute.INDEX ) ? true : false, '\n',
							'Smoothing', ( groupAttributes & GroupDataAttribute.SMOOTHING ) ? true : false, '\n',
							'Material', ( groupAttributes & GroupDataAttribute.MATERIAL ) ? true : false

						);

					}

					// Group Name
					var groupName;
					if ( groupAttributes & GroupDataAttribute.NAME ) {

						groupName = readString( readUint16() );
						if ( this.debug ) console.log( 'Group Name', groupName );

					}

					if ( objectAttributes & ObjectDataAttribute.GEOMETRY ) {

						// Indices
						var indices;
						if ( groupAttributes & GroupDataAttribute.INDEX ) {

							// Index Count
							var indexCount = readUint32();
							if ( this.debug ) console.log( 'Index Count', indexCount );

							// Indices
							indices = readUint16Array( indexCount );

						}

						// Smoothing
						var smoothing = ( groupAttributes & GroupDataAttribute.SMOOTHING ) ? readUint8() : 0;
						if ( this.debug && ( groupAttributes & GroupDataAttribute.SMOOTHING ) ) console.log( 'Smoothing', smoothing );

						var geometry = new THREE.BufferGeometry();
						if ( vertices.positions ) geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices.positions, 3 ) );
						vertices.normals ? geometry.addAttribute( 'normal', new THREE.BufferAttribute( vertices.normals, 3 ) ) : geometry.computeVertexNormals();
						if ( vertices.uvs ) geometry.addAttribute( 'uv', new THREE.BufferAttribute( vertices.uvs, 2 ) );
						if ( indices ) geometry.setIndex( new THREE.BufferAttribute( indices, 1 ) );
						geometry.addGroup( 0, 1, 0 );

						var material;
						if ( groupAttributes & GroupDataAttribute.MATERIAL ) {

							// Material ID
							var materialId = readUint16();
							material = materials[ materialId ].clone() || new THREE.MeshPhongMaterial();
							material.shading = ( smoothing > 0 ) ? THREE.SmoothShading : THREE.FlatShading;
							if ( this.debug ) console.log( 'Group Material', materialId, material );

						}

						var mesh = new THREE.Mesh( geometry, material );
						if ( groupName ) mesh.name = groupName;
						asset.add( mesh );

					}

				}

			}

		}

		if ( this.performanceTimer ) console.timeEnd( 'BOMLoader' );

		return assets;

	}

};

THREE.BOMLoaderUtil = THREE.BOMLoaderUtil || {};
THREE.BOMLoaderUtil.multiload = function ( requests, onComplete ) {

	requests = ( requests.constructor === Array ) ? requests : [ requests ];
	var requestCount = requests.length;
	var responses = [];

	function loadRequest ( index, request ) {

		var loader = new THREE.BOMLoader();
		loader.setTexturePath( request.url.split( '/' ).slice( 0, -1 ).join( '/' ) + '/' );
		if ( request.debug !== undefined ) loader.setDebug( request.debug );
		if ( request.timer !== undefined ) loader.setPerfTimer( request.timer );
		if ( request.crossOrigin !== undefined ) loader.setCrossOrigin( request.crossOrigin );
		if ( request.responseType !== undefined ) loader.setResponseType( request.responseType );
		loader.load( request.url, function ( object ) {

			request.object = object;
			responses[ index ] = request;
			if ( --requestCount <= 0 ) onComplete( responses );

		} );

	}

	for ( var i = 0; i < requests.length; ++i ) loadRequest( i, requests[ i ] );

};
