function Sonifier() {
  this.cursor = null;
  this.cursorpoint = null;
  this.output = null;
  this.context = null;
  this.oscillator = null;
  this.chartarea = null;
  this.dataLine = null;
  this.dataLinePoints = null;
  this.minx = 0;
  this.maxx = 0;
  this.miny = 0;
  this.maxy = 0;
  this.isPlaying = false;

	// constants
  this.svgns = "http://www.w3.org/2000/svg";
  this.coords = document.documentElement.createSVGPoint();
}

Sonifier.prototype.init = function ( chartarea, dataLine, width, height, color ) {	
	this.chartarea = chartarea;
	this.dataLine = dataLine;
	this.maxx = width;
	this.maxy = height;

  this.cursor = document.createElementNS(this.svgns, 'path');
  this.cursor.setAttribute("id", "cursor");
  this.cursor.setAttribute("d", "M0,0 0," + this.maxy);
  this.cursor.setAttribute("fill", "none");
  this.cursor.setAttribute("stroke", color);
  this.cursor.setAttribute("stroke-width", "1");
  this.cursor.setAttribute("stroke-linecap", "round");
  this.cursor.setAttribute("stroke-dasharray", "5");
  this.chartarea.appendChild( this.cursor );

  this.cursorpoint = document.createElementNS(this.svgns, "circle");
  this.cursorpoint.setAttribute("id", "cursorpoint");
  this.cursorpoint.setAttribute("cx", 0 );
  this.cursorpoint.setAttribute("cy", this.maxy );
  this.cursorpoint.setAttribute("r", 3 );
  this.cursorpoint.setAttribute("fill", "none");
  this.cursorpoint.setAttribute("stroke", color);
  this.chartarea.appendChild( this.cursorpoint );

  this.chartarea.addEventListener('mousemove', bind(this, this.trackPointer), false );
  document.documentElement.addEventListener('keydown', bind(this, this.trackKeys), false );
  // document.documentElement.addEventListener('keyup', bind(this, this.trackKeys), false );
  // document.documentElement.addEventListener('click', this.toggleAudio, false );

	console.log( this )
};

Sonifier.prototype.toggleAudio = function (event) { 
  //this.oscillator.stop();
}   

Sonifier.prototype.trackKeys = function (event) {
  // if ( event.shiftKey ) {
  // }

	console.log( this )
  this.coords.y = 0;

  var x = parseFloat( this.cursorpoint.getAttribute( "cx" ) );
  
  switch ( event.keyIdentifier) {
    case "Down":
    case "Right":
      x += 3;
      // console.log( event ) 
      break;

    case "Up":
    case "Left":
      x -= 3;
      // console.log( event ) 
      break;
  }

  this.coords.x = x;
  this.updateCursor();
}   

Sonifier.prototype.trackPointer = function (event) { 
	if ( this.cursor ) {
    this.coords.x = event.clientX;
    this.coords.y = event.clientY;
    this.coords = this.coords.matrixTransform( this.cursor.getScreenCTM().inverse() );			

	  this.updateCursor();
	}
}   

Sonifier.prototype.updateCursor = function () { 
  // clip to range
  var x = Math.max( Math.min( this.maxx, this.coords.x ), this.minx );

  var cursor_p1 = new Point2D(x, this.miny);
  var cursor_p2 = new Point2D(x, this.maxy);

  if (!this.dataLinePoints) {
    this.dataLinePoints = [];
    var dataLineArray = this.dataLine.getAttribute("points").replace(/[A-Za-z]+/g, '').split(' ');
    for (var vp in dataLineArray ) {
			if (typeof dataLineArray[vp] != 'function') { 
	      var values = dataLineArray[vp].split(',');
	      this.dataLinePoints.push( new Point2D( parseFloat(values[0]), parseFloat(values[1]) ) );
			}
    }
  }
  

  // update cursor line
  this.cursor.setAttribute('d', "M" + x + "," + this.miny + " " + x + "," + this.maxy);

  // find intersection
  var intersections = Intersection.intersectLinePolygon(
    cursor_p1, cursor_p2, this.dataLinePoints
  );

  var valpoint = (intersections.points.length > 0)
    ? intersections.points[0]
    : this.dataLine.getPointAtLength(x);

  this.cursorpoint.setAttribute( "cx", x );
  this.cursorpoint.setAttribute( "cy", valpoint.y );

  var frequency = 500 - valpoint.y;
  //output.firstChild.nodeValue = ( frequency );
  this.setTone ( frequency )
}


Sonifier.prototype.setTone = function ( frequency ) { 
  if (!this.oscillator) {
    this.context = new AudioContext();

    this.oscillator = this.context.createOscillator();
    this.oscillator.connect(this.context.destination);

    this.oscillator.start(0);
  }

  this.oscillator.frequency.value = frequency;
}


/****
* Helper methods
****/

Array.prototype.max = function() {
  return Math.max.apply(null, this)
}

Array.prototype.min = function() {
  return Math.min.apply(null, this)
}

function bind (scope, fn) {
	return function() {
		return fn.apply( scope, arguments );
	}
}

/******
* 
* from Intersection.js
* by Kevin Lindsey
* https://gemnasium.com/npms/kld-intersections
*
******/

function Point2D(x, y) {
    if ( arguments.length > 0 ) {
        this.x = x;
        this.y = y;
    }
}

function Intersection(status) {
    if ( arguments.length > 0 ) {
        this.init(status);
    }
}


Intersection.prototype.init = function(status) {
    this.status = status;
    this.points = new Array();
};


Intersection.prototype.appendPoints = function(points) {
    this.points = this.points.concat(points);
};


Intersection.intersectLineLine = function(a1, a2, b1, b2) {
    var result;
    
    var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
    var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
    var u_b  = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);

    if ( u_b != 0 ) {
        var ua = ua_t / u_b;
        var ub = ub_t / u_b;

        if ( 0 <= ua && ua <= 1 && 0 <= ub && ub <= 1 ) {
            result = new Intersection("Intersection");
            result.points.push(
                new Point2D(
                    a1.x + ua * (a2.x - a1.x),
                    a1.y + ua * (a2.y - a1.y)
                )
            );
        } else {
            result = new Intersection("No Intersection");
        }
    } else {
        if ( ua_t == 0 || ub_t == 0 ) {
            result = new Intersection("Coincident");
        } else {
            result = new Intersection("Parallel");
        }
    }

    return result;
};


Intersection.intersectLinePolygon = function(a1, a2, points) {
    var result = new Intersection("No Intersection");
    var length = points.length;

    for ( var i = 0; i < length; i++ ) {
        var b1 = points[i];
        var b2 = points[(i+1) % length];
        var inter = Intersection.intersectLineLine(a1, a2, b1, b2);

        result.appendPoints(inter.points);
    }

    if ( result.points.length > 0 ) result.status = "Intersection";

    return result;
};


/******
* 
* from webkitAudioContext-MonkeyPatch
* by Chris Wilson
* https://github.com/cwilso/webkitAudioContext-MonkeyPatch
*
******/

if (window.hasOwnProperty('webkitAudioContext') &&
    !window.hasOwnProperty('AudioContext')) {
  window.AudioContext = webkitAudioContext;

  if (AudioContext.prototype.hasOwnProperty( 'createOscillator' )) {
    AudioContext.prototype.internal_createOscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function() {
      var node = this.internal_createOscillator();
      return node;
    };
  }
}

