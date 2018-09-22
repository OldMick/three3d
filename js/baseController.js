//Controller for the coffee mug model
//3D Library used - three.js

var app = angular.module("3dpreviewapp", []);
app.controller("baseController", function ($scope, $timeout)
{
    THREE.ImageUtils.crossOrigin = "";
    var scene, camera, renderer, object, group, material, img,
        bitmap, g, boxmaterial, rotateAngle = 0, isPaused = false,
        ismousedown = false, lastmouseposition, encoder,
        WIDTH = 1024, HEIGHT = 768, stageContext,
        captureCanvas, captureContext, captureImg, captureCount = 0,
        backgroundImg, modelFile, modelScale, textureImg, reflectivity = 0.5,
        materialColor = 0xffffff, shininess = 10, direction = 1,
        rotateSpeed = 1, gifSource, uploadImgSrc, data,
        watermark, imageblob, imgPath, colorrects, imagerect,
        removeChildIndices, timeouttId;

    $scope.rotateAngle = 0;
    $scope.objectColors = [];
    $scope.isLoading = false;
    $scope.loadingMessage = 'Loading..';
    $scope.backgrounds = [];
    $scope.selectedBg = 'bg1';
    $scope.isPreloading = $scope.showGifPopup = false;

    var host = 'http://3dmockuper.com';

    $scope.loadSettings = function()
    {
        $scope.isLoading = true;
        var client = new XMLHttpRequest();
        client.open('GET', 'settings.js', true);
        client.onreadystatechange = function() {
            if (client.readyState == 4 && client.status == 200)
            {
                data = JSON.parse(client.responseText);
                $timeout(function() {
                    $scope.objectColors = data.objectColors;
                    backgroundImg = data.background;
                    modelFile = data.model;
                    $scope.backgrounds = data.backgrounds;
                    $scope.selectedBg = $scope.backgrounds[0];
                    textureImg = data.texture;
                    init();
                });
            }
        }
        client.send();
    }

    init = function()
    {
        /*stats = new Stats();
        stats.setMode( 1 ); // 0: fps, 1: ms, 2: mb, 3+: custom
        document.body.appendChild( stats.domElement );
        stats.begin();*/
        //console.log = function(){};
        // Create the scene and set the scene size.
        scene = new THREE.Scene();
        //scene.fog = new THREE.FogExp2( 0x999999, 0.6, 600 );

        // Create a renderer and add it to the DOM.
        renderer = webglAvailable() ? new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer:true }): new THREE.CanvasRenderer({antialias:true});
        //renderer = new THREE.CanvasRenderer({antialias:true});
        //renderer.setClearColor( 0x7E7FA8, 1 );
        renderer.setSize(WIDTH, HEIGHT);

        $('#stageContent').append(renderer.domElement);

        $('#angleSlider').attr('max', 360/rotateSpeed);
        //renderer.shadowMap.enabled = true;
        //renderer.shadowMap.type = THREE.PCFShadowMap;

        // Create a camera, zoom it out from the model a bit, and add it to the scene.
        camera = new THREE.PerspectiveCamera(40, WIDTH / HEIGHT, 0.1, 100);
        //camera.position.y = 0.5;
        scene.add(camera);

        group = new THREE.Object3D();
        scene.add( group );

        watermark = new Image();
        watermark.src = 'images/watermark.png';

        addLights();
        addBackground();
        addModel();
    }


    //Method used to add different lights to the 3d environment
    //Can be configured or changed to test the ambience of the scene.
    function addLights()
    {
        // Create some lights and add them to the scene.
        var spotLight = new THREE.SpotLight( 0xffffff, 0.5, 0, Math.PI / 2 );
        spotLight.position.set(-500, 200, -580);
        spotLight.target.position.set( 0, 0, 0 );
        //spotLight.shadowCameraVisible = true;
        spotLight.castShadow = false;

        spotLight.shadow.camera.near = 200;   // keep near and far planes as tight as possible
        spotLight.shadow.camera.far = 5000;    // shadows not cast past the far plane
        spotLight.shadow.camera.fov = 20;
        spotLight.shadow.bias = 0.0001;    // a parameter you can tweak if there are artifacts
        //spotLight.shadow.darkness = 0.2;
        spotLight.shadow.mapSize.width = 2048;
        spotLight.shadow.mapSize.height = 2048;
        scene.add( spotLight );

        var pointLight2 = new THREE.PointLight( 0x84C46E );
        pointLight2.position.x = 100;
        pointLight2.position.y = 500;
        pointLight2.position.z = 150;
        pointLight2.distance = 1000;
        pointLight2.intensity = 3;
        //pointLight2.castShadow = true;
        //pointLight2.shadowCameraVisible = true;
        // scene.add( pointLight2 );

        var directionalLight = new THREE.DirectionalLight( 0xffffff );
        directionalLight.position.set( -600, 200, 800 ).normalize();
        directionalLight.intensity = 0.5;
        //directionalLight.castShadow = true;
        scene.add( directionalLight );

        var directionalLight2 = new THREE.DirectionalLight( 0xffffff );
        directionalLight2.position.set( -300, 400, -300 ).normalize();
        directionalLight2.intensity = 0.1;
        directionalLight2.castShadow = true;
        //directionalLight2.shadow.camera.visible = true;
        directionalLight2.shadow.camera.left = -1; // or whatever value works for the scale of your scene
        directionalLight2.shadow.camera.right = 1;
        directionalLight2.shadow.camera.top = 1;
        directionalLight2.shadow.camera.bottom = -1;
        //directionalLight2.shadowDarkness = 0.2;

        directionalLight2.shadow.bias = 0.0001;
        directionalLight2.shadow.radius = 1;
        directionalLight2.shadow.mapSize.width = 2048;
        directionalLight2.shadow.mapSize.height = 2048;
        scene.add( directionalLight2 );

        var ambientLight = new THREE.AmbientLight( 0xffffff );
        ambientLight.intensity = 1;
        //ambientLight.shadowCameraVisible = true;
        scene.add( ambientLight );
    }

    //This method is used to add the background scene image using a textureloader
    //Manage watermark and cofigure background size here
    function addBackground()
    {
        backgroundTexture = new THREE.TextureLoader().load( 'images/'+$scope.selectedBg+'.jpg', function(){
            //animate();
        });
        backgroundTexture.needsUpdate = true;
        var backgroundGeometry = new THREE.CubeGeometry(0.01,1.2,1.55);
        var backgroundMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            map: backgroundTexture,
        });

        background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
        // background.position.x=0.5;
        // background.position.y=0.27;
        // background.position.z=0;

        // background.rotation.z=-12*Math.PI/180;

        background.rotation.set(25, -55, 0);
        background.position.set(0, 0.5, -1);

        background.scale.set(2, 2, 2);


        scene.add(background);

        var watermarkTexture = new THREE.TextureLoader().load( 'images/logo.png');
        var watermarkGeometry = new THREE.CubeGeometry(0.0001,0.08,0.28);
        var watermarkMaterial = new THREE.MeshPhongMaterial({
            color: 0x888888,
            map: watermarkTexture,
            transparent: true
        });

        watermark = new THREE.Mesh(watermarkGeometry, watermarkMaterial);
        watermark.position.x=0.3;
        watermark.position.y=-0.16;
        watermark.position.z=0.5;
        watermark.visible = false;
        //watermark.rotation.z=-12*Math.PI/180;
        scene.add(watermark);
    }

    //Method to add the 3d model
    //This imports .obj file format that can be configured in the settings.js file
    function addModel()
    {
        var httpReq = new XMLHttpRequest();
        httpReq.open('GET', modelFile+'/settings.js', true);
        httpReq.onreadystatechange = function()
        {
            if(httpReq.readyState == 4 && httpReq.status == 200)
            {
                var modeldata = JSON.parse(httpReq.responseText);
                modelScale = parseFloat(modeldata.scale);
                reflectivity = parseFloat(modeldata.reflectivity);
                shininess = parseFloat(modeldata.shininess);
                materialColor = modeldata.color;
                rotateSpeed = parseFloat(modeldata.rotateSpeed);
                direction = parseFloat(modeldata.direction);
                colorrects = modeldata.colorrects;
                imagerect = modeldata.imagerect;
                removeChildIndices = modeldata.removeChildIndices;

                if(direction == -1) {
                    $('#angleSlider').attr('min', -360/rotateSpeed);
                    $('#angleSlider').attr('max', 0);
                }
                else
                {
                    $('#angleSlider').attr('min', 0);
                    $('#angleSlider').attr('max', 360/rotateSpeed);
                }
                bitmap = document.getElementById('drawcanvas');
                g = bitmap.getContext('2d');
                bitmap.width = 1024;
                bitmap.height = 1024;
                g.fillStyle=$scope.objectColors[0].color1;
                g.fillRect(0,0,bitmap.width,bitmap.height);

                // g.fillStyle="#ff1c24";
                // g.fillRect(0, 0, 400, 400);
                //
                // g.fillStyle="#fe5fff";
                // g.fillRect(100, 100, 400, 400);
                //
                // g.fillStyle="#435fff";
                // g.fillRect(200, 200, 400, 400);
                //
                // g.fillStyle="#54ff4c";
                // g.fillRect(300, 300, 400, 400);

                // g.fillStyle="#45f256";
                // g.fillRect(0, 0, 300, 300);
                //
                // console.log(0,0,bitmap.width,bitmap.height);
                // console.log(colorrects[1][0],colorrects[1][1],colorrects[1][2],colorrects[1][3]);


                g.fillStyle=$scope.objectColors[0].color2;
                g.fillRect(colorrects[1][0],colorrects[1][1],colorrects[1][2],colorrects[1][3]);

                // canvas contents will be used for a texture
                var texture = new THREE.Texture(bitmap);
                texture.needsUpdate = true;

                var path = "images/textures/";
                var format = '.png';
                var urls = [
                    path + 'px' + format, path + 'nx' + format,
                    path + 'py' + format, path + 'ny' + format,
                    path + 'pz' + format, path + 'nz' + format
                ];
                var textureCube = new THREE.CubeTextureLoader().load( urls );
                //textureCube.format = THREE.RGBFormat;

                material = new THREE.MeshPhongMaterial({
                    color: materialColor,
                    map: texture,
                    side: THREE.DoubleSide,
                    //specular: 0xffffff,
                    //specularMap: backgroundTexture,
                    shininess: shininess,
                    envMap: textureCube,
                    reflectivity: reflectivity,
                    //opacity: 0.9,
                    //transparent: true,
                    //bumpMap: texture,
                    //bumpScale : 0.001,
                });

                floorTexture = new THREE.TextureLoader().load( 'images/shadow.png' );
                floorTexture.needsUpdate = true;
                var floorGeometry = new THREE.CubeGeometry(0.39,0.0001,0.39);
                var floorMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    map: floorTexture,
                    //side: THREE.DoubleSide,
                    transparent: true
                });

                var floor = new THREE.Mesh(floorGeometry, floorMaterial);
                floor.position.x=0;
                floor.position.y=0;
                floor.scale.set( modelScale/0.07,modelScale/0.07,modelScale/0.07 );
                group.add(floor);
                //group.position.z = -0.2;

                var axisHelper = new THREE.AxisHelper( 1 );
                scene.add( axisHelper );

                var loader = new THREE.OBJLoader();
                loader.load(modelFile+'/cup2.obj', function(mesh)
                {
                    // mesh.scale.set( modelScale,modelScale,modelScale );
                    // mesh.position.x = 0.1;
                    // mesh.position.y = 0.084;

                    // mesh.scale.set(0.0123, 0.01288, 0.0123);
                    mesh.scale.set(0.0005, 0.0005, 0.0005);
                    mesh.position.set(0, 0, 0);

                    group.add(mesh);
                    object = mesh;
                    //group.rotation.z = Math.PI * 12/180;

                    //if(textureImg) onFileSelect(textureImg);
                    //mesh = new THREE.Mesh(geometry, material);
                    var childFound = false;
                    for ( var i = 0, l = mesh.children.length; i < l; i ++ ) {
                        // for(var c = 0; c < removeChildIndices.length; c++)
                        //     if(i == c) mesh.children[i].visible = false;
                        mesh.children[i].material = material;
                        mesh.children[i].material.map.needsUpdate = true;

                    }
                    // animate();
                    /*camera.position.x = Math.cos( 180*Math.PI/180 ) * 1;
                    camera.position.y = 2*Math.cos( 90*Math.PI/180 );
                    camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );*/

                    // camera.position.x = Math.cos( 180*Math.PI/180 ) * 1;
                    // camera.position.y = 0.55;
                    // camera.lookAt( new THREE.Vector3( 0.5, 0.25, 0 ) );


                    camera.position.set(0, 0.5, 2);
                    camera.lookAt( new THREE.Vector3( 0, 0.5, 0 ) );


                    renderer.render(scene, camera);
                    $timeout(function(){$scope.isLoading = false;});
                });
            }
        }

        httpReq.send();
    }

    function webglAvailable() {
        try {
            var canvas = document.createElement("canvas");
            return !!
                    window.WebGLRenderingContext &&
                (canvas.getContext("webgl") ||
                    canvas.getContext("experimental-webgl"));
        } catch(e) {
            return false;
        }
    }

    $scope.openFileOption = function()
    {
        document.getElementById("file1").click();
        $scope.playPause(true);
    }

    onFileSelect = function(textureURL)
    {
        var file = document.getElementById("file1").files[0], url;
        if(file) url = URL.createObjectURL(file);
        if(textureURL) url = textureURL;
        img = new Image();
        img.onload = function() {

            console.log('=== you are ===');
            console.log(imagerect);

            g.drawImage(img, imagerect[0],imagerect[1],imagerect[2],imagerect[3]);
            update();
            if(!textureURL) $scope.playPause(isPaused);
        }
        img.src = url;
    }

    $scope.changeObjectColor = function(value)
    {
        g.fillStyle = value.color1;
        g.fillRect(0,0,bitmap.width,bitmap.height);

        g.fillStyle = value.color2;
        g.fillRect(colorrects[0][0],colorrects[0][1],colorrects[0][2],colorrects[0][3]);
        g.fillRect(colorrects[1][0],colorrects[1][1],colorrects[1][2],colorrects[1][3]);


        if(img) g.drawImage(img, imagerect[0],imagerect[1],imagerect[2],imagerect[3]);
        update();
    }

    onSliderAngleChange = function(value)
    {
        $scope.playPause(true);
        rotateAngle = direction*value;
        rotateObject(direction*value);
    }

    onsliderhover = function(value)
    {
        $scope.playPause(isPaused);
    }

    $scope.playPause = function(value)
    {
        isPaused = !isPaused;
        if(value) isPaused = value;
        $('#playPauseBtn').html(isPaused ? 'Play' : 'Pause');
        animate();
    }

    function update()
    {
        var texture = new THREE.Texture(bitmap);
        /*var material = new THREE.MeshPhongMaterial({
          map: texture,
          side: THREE.DoubleSide,
      });*/
        var childFound = false;
        for ( var i = 0, l = object.children.length; i < l; i ++ ) {
            //for(var c = 0; c < removeChildIndices.length; c++)
            //if(i == c) mesh.children[i].visible = false;
            object.children[i].material = material;
            object.children[i].material.map.needsUpdate = true;
        }

        renderer.render(scene, camera);
    }

    function animate() {
        if(isPaused && timeouttId) clearTimeout(timeouttId);
        else timeouttId = setTimeout(function(){
            if(object)
            {
                rotateObject(rotateAngle);
                rotateAngle+=1;
                if(rotateAngle > 360/rotateSpeed) rotateAngle = 0;
                //console.log('animate',rotateAngle);
                animate();
                //object.rotation.z = Math.PI  *timer * 10/180;
            }
        },1000/60)
    }
    //var axis = new THREE.Vector3(0,0.5,0.1);
    function rotateObject(angle)
    {
        object.rotation.y = (direction * Math.PI *angle*rotateSpeed/180);
        $('#angleSlider').val(direction*angle);
        renderer.render(scene, camera);
        //stats.update();
    }

    //Method used to capture the animated scene as gif file
    $scope.captureGif = function()
    {
        watermark.visible = true;
        $scope.captureClicked = false;
        $scope.playPause(true);
        rotateAngle = 0;
        renderer.setSize(WIDTH/2, HEIGHT/2);
        $scope.isPreloading = true;
        $scope.showGifPopup = true;
        gif = new GIF({
            workers: 5,
            quality: 10,
            workerScript: host+'/js/gif.worker.js'
        });
        gif.on('finished', function(blob) {
            imageblob = blob;
            $('#gifImg')[0].src = URL.createObjectURL(blob);
            watermark.visible = false;
            $timeout(function(){$scope.isPreloading = false;});
        });
        /*gif.on('progress', function(value){
            console.log(value*100);
        });*/

        generateGIF();
    }

    //Method used to capture a scene frame as Jpg file
    $scope.captureJpg = function()
    {
        watermark.visible = true;
        renderer.render(scene, camera);
        download(renderer.domElement.toDataURL('image/jpeg'), 'download.jpg', 'image/jpeg');
        $scope.captureClicked = false;
        watermark.visible = false;
        //fbShare();
    }

    //Method used to download the gif file
    $scope.downloadGifFile = function()
    {
        download(imageblob, 'download.gif', 'image/gif');
    }

    //Method used to share the gif file on facebook
    $scope.shareGif = function()
    {
        if(imgPath) window.open('https://www.facebook.com/sharer/sharer.php?u='+imgPath, 'Share Facebook', config='height=384, width=512');
        else
        {
            $scope.loadingMessage = 'Uploading..';
            $scope.isLoading = true;
            $('#gifContainer').css('pointer-events', 'none');

            var reader = new window.FileReader();
            reader.readAsDataURL(imageblob);
            reader.onloadend = function() {
                base64data = reader.result;
                console.log(base64data );

                var data = new FormData();
                //data.append('fname', 'gif_to_upload.gif');
                data.append('imgData', base64data);

                $.ajax({
                    type: 'POST',
                    processData: false, // important
                    contentType: false, // important
                    data: data,
                    //url: 'http://3dmockuper.com/gifupload.php',
                    url: host+'/gifupload.php',
                    success: function(path){
                        $timeout(function(){$scope.isLoading = false;},100);
                        //fbShare(imgPath);
                        $('#gifContainer').css('pointer-events', 'all');
                        imgPath = path;
                        $('#gifImg')[0].src = imgPath;
                        //$('#fbBtn').click();
                        window.open('https://www.facebook.com/sharer/sharer.php?u='+imgPath, 'Share Facebook', config='height=384, width=512');
                    }
                });
            }
        }

    }

    //Method used to control the gif animation and frames
    generateGIF = function()
    {
        imgPath = null;
        if(gif)
        {
            if(captureCount >= 60/rotateSpeed) {
                gif.render();
                $scope.stopGif();
            }
            else
            {
                rotateObject(rotateAngle);
                renderer.render(scene, camera);
                $('#gifImg')[0].src = renderer.domElement.toDataURL();

                gif.addFrame(renderer.domElement, {delay:1, copy:true});
                rotateAngle+=6;
                var percentage = Math.round(100*captureCount/(60/rotateSpeed));
                $('#preloader').css('width', percentage+'%');
                $('#preloader').html(percentage+'%');
                //gif.render();
                captureCount++;
                setTimeout(function(){
                    generateGIF();
                },10);

            }
        }
    }


    $scope.stopGif = function()
    {
        $('#preloader').css('width','100%');
        $('#preloader').html('Finalizing..');
        $scope.playPause(true);
        captureCount = 0;
        renderer.setSize(WIDTH, HEIGHT);
        renderer.render(scene, camera);
    }

    $scope.captureClick = function()
    {
        $scope.captureClicked = !$scope.captureClicked;
    }

    $scope.closePopup = function()
    {
        $('#gifImg')[0].src = '';
        $scope.showGifPopup = false;
    }

    $scope.fbGif = function()
    {
        fbShare(imgPath);
    }

    function fbShare(link) {
        FB.ui( {
            method: 'share',
            name: "3D Mockuper",
            //link: "http://3dmockuper.com/images/userimages/60984498a2ba3e12e30ce1f4de22e1d4.gif",
            href: link,
            caption: "Visit 3dmockuper.com",
            hashtag: "#3dmockuper",
            actions: {"name":"3D Mockuper", "link":"http://www.3dmockuper.com"}
        }, function( response ) {
            console.log(response);
        });
    }

    //Handles background image change
    $scope.changeBG = function(bg)
    {
        $scope.selectedBg = bg;
        if(bg != 'addimage')
        {
            backgroundTexture = new THREE.TextureLoader().load( 'images/'+bg+'.jpg', function(){
                background.material.map = backgroundTexture;
                backgroundTexture.needsUpdate = true;
                renderer.render(scene, camera);
                renderer.render(scene, camera);
            });
        }
        else
        {
            document.getElementById("file2").click();
            renderer.render(scene, camera);
        }
        $scope.showBgList = false;

    }

    //File browse handler
    onBgBrowseSelect = function(textureURL)
    {
        var file = document.getElementById("file2").files[0], url;
        if(file) url = URL.createObjectURL(file);
        backgroundTexture = new THREE.TextureLoader().load(url, function(){
            renderer.render(scene, camera);
        });
        background.material.map = backgroundTexture;
        backgroundTexture.needsUpdate = true;
    }

    $scope.clickBgIcon = function()
    {
        $scope.showBgList = true;
    }

    onrotateZChange = function(value)
    {
        group.rotation.x = value*Math.PI/180;
        renderer.render(scene, camera);
    }
})