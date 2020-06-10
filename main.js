var ctx, ctx0;
var W, H;
var masses;
var isMouseDown;
var mouseX, mouseY;
var params;

var G = 100;
var WALL_DAMP = 0.85;
var GRAVITY_DAMP = 0.1;
var MOUSE_POWER = 30000;
var PHI_CONJ = 0.618033988749895;
var VI_RANGE = 100;

// http://stackoverflow.com/a/901144/2514396
function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function setup() {
  params = {
    func     : Math.random,
    amt      : 100,
    accuracy : 60
  };
  var func = getParameterByName('func');
  var amt = getParameterByName('amt');
  var accuracy = getParameterByName('accuracy');
  if (func) {
    params.func = (function(s) {
      return function(x) { return 1 - (eval(s) % 1); };
    })(func);
  }
  if (amt) {
    params.amt = parseInt(amt);
  }
  if (accuracy) {
    params.accuracy = parseInt(accuracy);
  }

  masses = [];
  var h = Math.random();
  for (var i = 0; i < params.amt; i++) {
    h += PHI_CONJ;
    h %= 1;
    var mass = {
      x: h * W,
      y: params.func(h) * H,
      m: 1 + Math.random() * 100,
      vx: (Math.random() * 2 - 1) * VI_RANGE / params.accuracy,
      vy: (Math.random() * 2 - 1) * VI_RANGE / params.accuracy,
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
  }); // dumby mass for when mouse pressed
}

function drawCircle(ctx, x, y, r, color) {
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(Math.floor(x), Math.floor(y), r, 0, 2 * Math.PI, false);
  ctx.stroke();
  ctx.closePath();
}

function fillCircle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(Math.floor(x), Math.floor(y), r, 0, 2 * Math.PI, false);
  ctx.fill();
  ctx.closePath();
}

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

function gforce(a, b) {
  // Newton's law of universal gravitation, dampened
  return (G / params.accuracy) * a.m * b.m / (Math.pow(H + W, 2) * GRAVITY_DAMP +
      (a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y));
}

function dir(a, b) {
  // returns unit vector in direction of a -> b
  var d = Math.sqrt((a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y));
  return {
    x: (b.x - a.x) / d,
    y: (b.y - a.y) / d
  };
}

// copyright at https://gist.github.com/schinckel/1588489#file-hsv2rgb-js
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
      masses[params.amt] = {
        x: mouseX,
        y: mouseY,
        m: MOUSE_POWER,
        vx: 0,
        vy: 0,
        real: false
      };
    }
    else {
      masses[params.amt].m = 0;
    }
  });
}

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

  // draw CM
  var cm = centerofmass();
  drawCircle(ctx, cm.x, cm.y, 10, 'white');
}

function startSimulation() {
  console.log("started");
  running = 1;
  // init
  W = document.body.clientWidth;
  H = document.body.clientHeight;

  // make canvases
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

  if (running == 0)
    return;
  setup();
  setInterval(run, 1000 / params.accuracy);
  window.requestAnimationFrame(draw);
}

function stopSimulation() {
    window.location.replace("#"); //fill the site url
    console.log("pressed");
}

$(function() {
    document.getElementById("simulator").addEventListener("click", startSimulation);
    document.addEventListener("keypress", stopSimulation);
});