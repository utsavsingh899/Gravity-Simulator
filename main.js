var ctx, ctx0;
var W, H;
var masses;
var isMouseDown;
var mouseX, mouseY;
var params;
var amt;
var accuracy;
var multipiler;

var G = 100;
var WALL_DAMP = 0.85;
var GRAVITY_DAMP = 0.1;
var MOUSE_POWER = 30000;
var PHI_CONJ = 0.618033988749895;
var VI_RANGE = 100;

// StackOverflow hack
function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// Used for the initial setup of the canvas
function setup() {
  params = {
    func     : Math.random
  };
  var func = getParameterByName('func');
  if (func) {
    params.func = (function(s) {
      return function(x) { return 1 - (eval(s) % 1); };
    })(func);
  }

  masses = [];
  var h = Math.random();
  for (var i = 0; i < amt; i++) {
    h += PHI_CONJ;
    h %= 1;
    var mass = {
      x: h * W,
      y: params.func(h) * H,
      m: 1 + Math.random() * 10 * multipiler,
      vx: (Math.random() * 2 - 1) * VI_RANGE / accuracy,
      vy: (Math.random() * 2 - 1) * VI_RANGE / accuracy,
      real: true,
      color: hsv2rgb(h, 0.5, 0.95)
    };
    masses.push(mass);
  }
  masses.push({
    x: 0,
    y: 0,
    m: 0,
    vx: 0,
    vy: 0,
    real: false
  }); // dummy mass for when mouse pressed
}

// Draws a circle, used for making the centre of mass circle
function drawCircle(ctx, x, y, r, color) {
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(Math.floor(x), Math.floor(y), r, 0, 2 * Math.PI, false);
  ctx.stroke();
  ctx.closePath();
}

// Draws & fills a circle, used for making the objects
function fillCircle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(Math.floor(x), Math.floor(y), r, 0, 2 * Math.PI, false);
  ctx.fill();
  ctx.closePath();
}

// Calculates the centre of mass of all objects
function centerofmass() {
  var ret = {
    x: 0,
    y: 0,
    m: 0
  };
  masses.forEach(function(mass) {
    if (mass.real) {
      ret.x += mass.x * mass.m;
      ret.y += mass.y * mass.m;
      ret.m += mass.m;
    }
  });
  ret.x /= ret.m;
  ret.y /= ret.m;
  return ret;
}

function sign(x) {
  if (x == 0) {
    return 0;
  }
  return x > 0 ? 1 : -1;
}

// Newton's law of universal gravitation, dampened
function gforce(a, b) {
  return (G / accuracy) * a.m * b.m / (Math.pow(H + W, 2) * GRAVITY_DAMP + (a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y));
}

// Returns unit vector in direction of a -> b
function dir(a, b) {
  var d = Math.sqrt((a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y));
  return {
    x: (b.x - a.x) / d,
    y: (b.y - a.y) / d
  };
}

// Converts hsv color code to rgb code
function hsv2rgb(h, s, v) {
  var rgb, i, data = [];
  if (s === 0) {
    rgb = [v, v, v];
  } else {
    h = h * 6;
    i = Math.floor(h);
    data = [v*(1-s), v*(1-s*(h-i)), v*(1-s*(1-(h-i)))];
    switch(i) {
    case 0:
      rgb = [v, data[2], data[0]];
      break;
    case 1:
      rgb = [data[1], v, data[0]];
      break;
    case 2:
      rgb = [data[0], v, data[2]];
      break;
    case 3:
      rgb = [data[0], data[1], v];
      break;
    case 4:
      rgb = [data[2], data[0], v];
      break;
    default:
      rgb = [v, data[0], data[1]];
      break;
    }
  }
  return '#' + rgb.map(function(x){
    return ('0' + Math.round(x*255).toString(16)).slice(-2);
  }).join('');
}

// Used for calculating new positions for each object
function run() {
  masses.forEach(function(mass, i) {
    masses.forEach(function(other, j) {
      if (mass.m != 0 && (i != j)) {
        var accel = gforce(mass, other) / mass.m;
        var direc = dir(mass, other);
        mass.vx += direc.x * accel;
        mass.vy += direc.y * accel;
      }
    });

    if (mass.x < 0 || mass.x > W) {
      mass.vx = -mass.vx;
      mass.vx = sign(mass.vx) * (Math.pow(Math.abs(mass.vx), WALL_DAMP));
      mass.vy = sign(mass.vy) * (Math.pow(Math.abs(mass.vy), WALL_DAMP));
      if (mass.x < 0) {
        mass.x = 0;
      }
      else {
        mass.x = W;
      }
    }
    if (mass.y < 0 || mass.y > H) {
      mass.vy = -mass.vy;
      mass.vx = sign(mass.vx) * (Math.pow(Math.abs(mass.vx), WALL_DAMP));
      mass.vy = sign(mass.vy) * (Math.pow(Math.abs(mass.vy), WALL_DAMP));
      if (mass.y < 0) {
        mass.y = 0;
      }
      else {
        mass.y = H;
      }
    }

    mass.x += mass.vx;
    mass.y += mass.vy;

    if (isMouseDown) {
      masses[amt] = {
        x: mouseX,
        y: mouseY,
        m: MOUSE_POWER,
        vx: 0,
        vy: 0,
        real: false
      };
    }
    else {
      masses[amt].m = 0;
    }
  });
}

// Used to draw the canvas
function draw() {
  window.requestAnimationFrame(draw);

  ctx0.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx0.fillRect(0, 0, W, H);
  masses.forEach(function(a) {
    if (a.real) fillCircle(ctx0, a.x, a.y, 2, 'white');
  });

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(ctx0.elem, 0, 0);
  masses.forEach(function(mass) {
    if (mass.m != 0 && mass.real) {
      fillCircle(ctx, mass.x, mass.y, Math.pow(mass.m, 1.0 / 3), mass.color);
    }
  });

  var cm = centerofmass();
  drawCircle(ctx, cm.x, cm.y, 10, 'white');
}

// Function to start the simulation process
function startSimulation() {
  amt = document.getElementById("planetAmount").value;
  accuracy = document.getElementById("fps").value;
  multipiler = document.getElementById("massMultiplier").value;

  W = document.body.clientWidth;
  H = document.body.clientHeight;

  var $canvas = $('<canvas></canvas>');
  $(document.body).append($canvas);
  var $canvas0 = $('<canvas></canvas>');

  ctx = $canvas[0].getContext('2d');
  ctx.elem = $canvas[0];
  ctx0 = $canvas0[0].getContext('2d');
  ctx0.elem = $canvas0[0];

  $canvas.attr('width', W);
  $canvas.attr('height', H);
  $canvas.css('width', W);
  $canvas.css('height', H);

  $canvas0.attr('width', W);
  $canvas0.attr('height', H);
  $canvas0.css('width', W);
  $canvas0.css('height', H);

  mouseX = W / 2;
  mouseY = H / 2;
  isMouseDown = false;

  $canvas.on('mousedown', function(e) {
    e.preventDefault();
    isMouseDown = true;
    mouseX = e.pageX;
    mouseY = e.pageY;
  });

  $canvas.on('touchstart', function(e) {
    e.preventDefault();
    isMouseDown = true;
    var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
    mouseX = touch.pageX;
    mouseY = touch.pageY;
  });

  $canvas.on('mouseup touchend', function(e) {
    e.preventDefault();
    isMouseDown = false;
  });

  $canvas.on('mousemove', function(e) {
    e.preventDefault();
    mouseX = e.pageX;
    mouseY = e.pageY;
  });

  $canvas.on('touchmove', function(e) {
    e.preventDefault();
    var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
    mouseX = touch.pageX;
    mouseY = touch.pageY;
  });

  setup();
  setInterval(run, 1000 / accuracy);
  window.requestAnimationFrame(draw);
}

// Function to stop the simulation process
function stopSimulation() {
    window.location.replace("index.html");
}

// Main Function
$(function() {
    document.getElementById("simulator").addEventListener("click", startSimulation);
    document.addEventListener("keydown", stopSimulation);
});