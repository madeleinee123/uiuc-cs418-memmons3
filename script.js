// global variables
let gl;
let shaderProgram;
let modelViewUniform;
let normalUniform;
let projectionUniform;
let texture, texture2;
let samplerUniform;
let sampler2Uniform;
let teapotVao;
let vertPosAttr;
let vertNormalAttr;
let vertTexCoordAttr;
let projection;

// vertex shader
let vs = `#version 300 es

        in vec3 aVertexPosition;
        in vec3 aVertexNormal;
        in vec2 aTexCoord;

        uniform mat4 uModelViewMatrix;
        uniform mat3 uNormalMatrix;
        uniform mat4 uProjectionMatrix;

        out vec2 vEnvironmentTextCoord;
        out vec3 vNormal;
        out vec3 vLight;
        out vec3 vPoint;
        out vec3 vVertexPosition;

        void main() {
            vNormal = normalize(uNormalMatrix*aVertexNormal);
            vec4 p = uModelViewMatrix*vec4(aVertexPosition, 1.0);
            vPoint = normalize(-p.xyz);
            vVertexPosition = aVertexPosition;
            
            vEnvironmentTextCoord.s = (vNormal.x + 1.0) / 2.0;
            vEnvironmentTextCoord.t = (vNormal.y + 1.0) / 2.0;

            gl_Position = uProjectionMatrix*uModelViewMatrix*vec4(aVertexPosition, 1.0);
        }
    `;

// fragment shader
let fs = `#version 300 es

        precision mediump float;

        in vec3 vNormal;
        in vec2 vEnvironmentTextCoord;
        in vec3 vPoint;
        in vec3 vVertexPosition;

        uniform sampler2D uSampler;
        uniform sampler2D uSampler2;

        out vec4 outColor;

        void main() {
            vec3 nHat = normalize(vNormal);
            vec3 lHat = normalize(vec3(1.0,0.25,0.0));
            vec3 vHat = normalize(vPoint);

            float diff = max(dot(nHat,lHat),0.0);
            vec3 diffuse = diff * vec3(1.0,1.0,1.0);

            vec3 reflectVector = reflect(-lHat,nHat);
            float spec = pow(max(dot(reflectVector,vHat),0.0), 10.0);
            vec3 specular = spec * vec3(1.0,1.0,1.0) * vec3(1.0,1.0,1.0);

            vec2 vIllinoisTextCoord;
            vIllinoisTextCoord.s = atan(-vVertexPosition.z, vVertexPosition.x) / (2.0 * 3.1415926535897932384626433832795028841971);
            vIllinoisTextCoord.t = vVertexPosition.y * 2.0 + 0.6;
            
            vec3 illinois = vec3(texture(uSampler, vIllinoisTextCoord));
            vec3 stadium = vec3(texture(uSampler2, vEnvironmentTextCoord));

            vec3 fragColor = ((0.1 * diffuse) + (0.3 *specular)) + 0.3 * illinois + (0.6 * stadium);

            outColor = vec4(fragColor,1.0);
        }
    `;


function initWebgl() {
    // create a graphics context
    let canvas = document.getElementById("myGLCanvas");
    gl = canvas.getContext("webgl2");
    if (!gl)
        alert("Failed to create WebGL context!");

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    loadShaders(vs, fs);

    // set up vertex array object
    teapotVao = gl.createVertexArray();
    gl.bindVertexArray(teapotVao);

    // create a coordinate buffer of vertex positions...
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array(teapot.positions), // ...and connect it to the vertex shader positions
        gl.STATIC_DRAW);

    gl.enableVertexAttribArray(vertPosAttr);
    gl.vertexAttribPointer(vertPosAttr, 3, gl.FLOAT, false, 0, 0);

    // create a coordinate buffer of vertex positions...
    let x, y, z, d, i;
    for (i = 0; i < teapot.normals.length; i += 3) {
        x = teapot.normals[i];
        y = teapot.normals[i + 1];
        z = teapot.normals[i + 2];

        d = 1.0 / Math.sqrt(x * x + y * y + z * z); // ...but normalize the normals first...

        teapot.normals[i] *= d;
        teapot.normals[i + 1] *= d;
        teapot.normals[i + 2] *= d;

    }

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array(teapot.normals), // ...and connect it to the vertex shader positions
        gl.STATIC_DRAW);

    gl.enableVertexAttribArray(vertNormalAttr);
    gl.vertexAttribPointer(vertNormalAttr, 3, gl.FLOAT, false, 0, 0);

    // create an index buffer of triangle faces
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(teapot.faces),
        gl.STATIC_DRAW);

    // set up texture and sampler
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    let sampler = gl.createSampler();
    gl.bindSampler(0, sampler);

    // load texture image using webgl2fundamentals boilerplate
    // initially creates just a 1x1 blue pixel as a placeholder
    // replaced by actual texture image once loaded
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA,
        gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

    let image = new Image();
    image.src = "illinois512-noborder.png";

    image.addEventListener("load", function () {
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
    });

    // set up second texture and sampler
    texture2 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture2);

    let sampler2 = gl.createSampler();
    gl.bindSampler(1, sampler2);

    // load texture image using webgl2fundamentals boilerplate
    // initially creates just a 1x1 blue pixel as a placeholder
    // replaced by actual texture image once loaded
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA,
        gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

    let image2 = new Image();
    image2.src = "stadium sphere.jpg";

    image2.addEventListener("load", function () {
        gl.bindTexture(gl.TEXTURE_2D, texture2);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, image2);
        gl.generateMipmap(gl.TEXTURE_2D);
    });

    // set up transformation matrices
    projection = glMatrix.mat4.create();
    glMatrix.mat4.perspective(projection, Math.PI / 6, 1.0, 0.1, null);

    requestAnimationFrame(draw);
}

function loadShaders(vertexShaderSource, fragmentShaderSource) {

    let vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
        alert("Vertex Shader Error:\n" + gl.getShaderInfoLog(vertexShader));

    let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
        alert("Fragment Shader Error:\n" + gl.getShaderInfoLog(fragmentShader));

    //
    // Compile shaders and get link ID's to the attributes and uniforms
    //

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
        alert("Failed to setup shaders");

    vertPosAttr = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    vertNormalAttr = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    vertTexCoordAttr = gl.getAttribLocation(shaderProgram, "aTexCoord")
    modelViewUniform = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
    normalUniform = gl.getUniformLocation(shaderProgram, "uNormalMatrix");
    projectionUniform = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
    samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
    sampler2Uniform = gl.getUniformLocation(shaderProgram, "uSampler2");
}

//
// draw callback function that is passed to requestAnimationFrame()
//

function draw(time) {
    gl.clearColor(0.075, 0.16, 0.294, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let modelView = glMatrix.mat4.create();
    glMatrix.mat4.translate(modelView, modelView, [0.0, 0.0, -2.0]);
    glMatrix.mat4.rotateY(modelView, modelView, time * 0.001);

    let normalMatrix = glMatrix.mat3.create();
    glMatrix.mat3.normalFromMat4(normalMatrix, modelView);

    gl.useProgram(shaderProgram);

    gl.uniformMatrix4fv(modelViewUniform, false, modelView);
    gl.uniformMatrix3fv(normalUniform, false, normalMatrix);
    gl.uniformMatrix4fv(projectionUniform, false, projection);

    gl.uniform1i(samplerUniform, 0);
    gl.uniform1i(sampler2Uniform, 1);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture2);

    gl.bindVertexArray(teapotVao);
    gl.drawElements(gl.TRIANGLES,
        teapot.faces.length,
        gl.UNSIGNED_SHORT,
        0);

    requestAnimationFrame(draw);
}


