"use strict";

function Sonifier() {
  this.svgroot = null;
  this.cursor = null;
  this.cursorpoint = null;
  this.output = null;
  this.audioContext = null;
  this.oscillator = null;
  this.volume = null;
  this.volumeLevel = 1;
  this.chartarea = null;
  this.dataLine = null;
  this.dataLinePoints = null;
  this.minx = 0;
  this.maxx = 0;
  this.miny = 0;
  this.maxy = 0;
  this.axisX = null;
  this.axisY = null;
  this.valuePoint = null;
  this.isMute = false;
  this.isPlaying = false;
  this.isReady = false;
  this.timer = null;
  this.cursorSpeed = 25;
  this.cursorDirection = 1;
  this.cursorColor = "white";
  this.cursorIntersect = false;
  this.tickContext = null;
  this.tickTone = null;

  this.coords = null;

	// constants
  this.svgns = "http://www.w3.org/2000/svg";
}

Sonifier.prototype.init = function ( svgroot, chartarea, dataLine, width, height, xAxis, yAxis, xAxisPos, yAxisPos, color ) {	
  this.svgroot = svgroot;
	this.chartarea = chartarea;
	this.dataLine = dataLine;
	this.maxx = width;
	this.maxy = height;
  this.coords = this.svgroot.createSVGPoint();
  this.axisX = new Axis( xAxis[0], xAxis[1], xAxisPos, 0, width);
  this.axisY = new Axis( yAxis[0], yAxis[1], yAxisPos, 0, height);
  this.cursorColor = color;


  // this.oscillator = null;
  // this.volume = null;
  this.volumeLevel = 1;
  this.valuePoint = null;
  this.isMute = false;
  this.timer = null;
  this.cursorDirection = 1;
  this.cursorIntersect = false;
	this.setFrequency(0);
	this.dataLinePoints = null;


	// create cursor line and point
  this.cursor = document.createElementNS(this.svgns, 'path');
  this.cursor.setAttribute("id", "cursor");
  this.cursor.setAttribute("d", "M0,0 0," + this.maxy);
  this.cursor.setAttribute("fill", "none");
  this.cursor.setAttribute("stroke", this.cursorColor);
  this.cursor.setAttribute("stroke-width", "1");
  this.cursor.setAttribute("stroke-linecap", "round");
  this.cursor.setAttribute("stroke-dasharray", "5");
  this.chartarea.appendChild( this.cursor );

  this.cursorpoint = document.createElementNS(this.svgns, "circle");
  this.cursorpoint.setAttribute("id", "cursorpoint");
  this.cursorpoint.setAttribute("cx", 0 );
  this.cursorpoint.setAttribute("cy", this.miny );
  this.cursorpoint.setAttribute("r", 3 );
  this.cursorpoint.setAttribute("fill", "none");
  this.cursorpoint.setAttribute("stroke", "none");
  this.chartarea.appendChild( this.cursorpoint );


  this.chartarea.addEventListener('mousemove', bind(this, this.trackPointer), false );
  // document.documentElement.addEventListener('click', this.toggleAudio, false );

	if ( !this.isReady ) {
		// only register key listener on first initialization
	  document.documentElement.addEventListener('keydown', bind(this, this.trackKeys), false );
	}
	
	// indicate first initialization
  this.isReady = true;

	// var axisMsg = "X-axis: " + this.axisX.min + " to " + this.axisX.max + ". Y-axis: " + this.axisY.min + " to " + this.axisY.max;
	// this.speak( axisMsg, false );
}


Sonifier.prototype.trackKeys = function (event) {
	var key = event.keyIdentifier.toLowerCase();
  
  switch ( key ) {
    case "down":
    case "right":
      this.stepCursor( 1 );
      break;

    case "up":
    case "left":
    this.stepCursor( -1 );
      break;

    case "enter":
      this.speak( null, true );
      break;


    case "p":
    case "u+0050":
      this.togglePlay();
      break;

    case "s":
    case "u+0053":
      this.resetPlay();
      break;

    case "[":
    case "u+005b":
      this.setPlayRate( 10 );
      break;

    case "]":
    case "u+005d":
      this.setPlayRate( -10 );
      break;

		case "m":
		case "u+004d":
			this.toggleVolume();
			break;

		case "o":
		case "u+004f":
			this.setDirection();
			break;
  }
}   


Sonifier.prototype.togglePlay = function ( forcePause ) {
	if ( this.timer || forcePause ) {
		this.stopPlay();
	} else {
	  this.isPlaying = true;
		var t = this; 

		this.timer = setInterval( function() { 
			t.coords.x += t.cursorDirection;
		  t.updateCursor();
		}, t.cursorSpeed);
	}
}   

Sonifier.prototype.stopPlay = function () { 
	clearInterval( this.timer );
	this.timer = null;
}   

Sonifier.prototype.resetPlay = function () { 
	this.stopPlay( 1, 1 );
  this.isPlaying = false;
	this.coords.x = 0;
	this.coords.y = 0;
	this.positionCursor( this.coords.x, this.coords.y, true );
	this.setVolume( 0 );
}   

Sonifier.prototype.setPlayRate = function ( rateDelta ) { 
	this.cursorSpeed += rateDelta;
	if ( this.timer ) {
		this.stopPlay();
		this.togglePlay();
	}
}   

Sonifier.prototype.stepCursor = function ( direction ) { 
	var x = parseFloat( this.cursorpoint.getAttribute( "cx" ) );
	this.coords.x = x + direction;
	// this.coords.y = 0;
	this.updateCursor();	
}   


Sonifier.prototype.setDirection = function () { 
  if ( 1 == this.cursorDirection ) {
		this.cursorDirection = -1;
	} else {
		this.cursorDirection = 1;
	}
	
	if ( !this.timer ) {
		this.togglePlay();
	}
}   


Sonifier.prototype.setRange = function ( xAxis, yAxis ) { 
  //this.oscillator.stop();
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

	if ( ( this.maxx == x && 1 == this.cursorDirection ) 
		|| ( 0 == x && -1 == this.cursorDirection ) ) {
		this.stopPlay();
	} else {
	  var cursor_p1 = new Point2D(x, this.miny);
	  var cursor_p2 = new Point2D(x, this.maxy);

	  if (!this.dataLinePoints) {
	    this.dataLinePoints = [];
	    var dataLineArray = this.dataLine.getAttribute("d").split('L');

	    for (var vp in dataLineArray ) {
				if (typeof dataLineArray[vp] != 'function') { 
		      var values = dataLineArray[vp].replace(/[A-Za-z]+/g, '').split(' ');
		      this.dataLinePoints.push( 
						new Point2D( 
							parseFloat(values[0]), 
							parseFloat(values[1]) 
						) 
					);
				}
	    }
	  }

	  // update cursor line
	  this.cursor.setAttribute('d', "M" + x + "," + this.miny + " " + x + "," + this.maxy);

	  // find intersection
	  var intersections = Intersection.intersectLinePolygon(
	    cursor_p1, cursor_p2, this.dataLinePoints
	  );

	  this.valuePoint = intersections.points[0];
		if (this.valuePoint) {
			if (!this.cursorIntersect) {
				this.cursorIntersect = true;
				this.setVolume( 1 );
			  this.cursorpoint.setAttribute( "stroke", this.cursorColor );
			}
		} else {
			this.valuePoint = {x:0, y:0};
			if (this.cursorIntersect) {
				this.cursorIntersect = false;				
				this.setVolume( 0 );
			  this.cursorpoint.setAttribute( "stroke", "none" );
			}
		}

		this.positionCursor( x, this.valuePoint.y, false );

	  var frequency = 500 - this.valuePoint.y;
	  this.setFrequency ( frequency );		
	}
	
	if ( this.axisX.pos == x 
		|| this.axisX.chartMin == x
		|| this.axisX.chartMax == x ) {
			console.log("tick")
			this.playTickmark();
		// 	var msg = "";
		// 	if (  this.axisX.pos == x ) {
		// 		msg = "axis marker: " + x;
		// 	} else if (  this.axisX.chartMin == x ) {
		// 		msg = "min: " + x;
		// 	}	else if (  this.axisX.chartMax == x ) {
		// 		msg = "max: " + x;
		// 	}
		// console.log(msg)
	}
}   

Sonifier.prototype.positionCursor = function ( x, y, setLine ) { 
  this.cursorpoint.setAttribute( "cx", x );
  this.cursorpoint.setAttribute( "cy", y );

	if ( setLine ) {
	  // update cursor line
	  this.cursor.setAttribute('d', "M" + x + "," + this.miny + " " + x + "," + this.maxy);
	}
}


Sonifier.prototype.setFrequency = function ( frequency ) { 
  if (!this.oscillator) {
    this.audioContext = new AudioContext();

    this.oscillator = this.audioContext.createOscillator();
    this.oscillator.detune.value = -50; //min="-100" max="100"

    this.oscillator.start(0);

    this.volume = this.audioContext.createGainNode(); 
    this.oscillator.connect(this.volume);
    // this.volume.connect(this.audioContext.destination);
    this.volume.gain.value = 0;

		// Create bandpass filter
		var filter = this.audioContext.createBiquadFilter();
		this.volume.connect(filter);
		filter.connect(this.audioContext.destination);
		// Create and specify parameters for the low-pass filter.
		filter.type = 0; // Low-pass filter. See BiquadFilterNode docs
		filter.frequency.value = 440; // Set cutoff to 440 HZ
  }

  this.oscillator.frequency.value = frequency;
}


Sonifier.prototype.setVolume = function ( gain ) { 
	if (this.volume) {
	  this.volume.gain.value = gain;		
	}
}


Sonifier.prototype.toggleVolume = function ( forceMute ) { 
	if ( !this.isMute || forceMute ) {
		this.isMute = true;
    this.volume.disconnect(this.audioContext.destination);
	} else {
		this.isMute = false;
    this.volume.connect(this.audioContext.destination);
	}
}


Sonifier.prototype.playTickmark = function () { 
  if (!this.tickTone) {
    this.tickContext = new AudioContext();

    this.tickTone = this.tickContext.createOscillator();
	  this.tickTone.frequency.value = 200;
  }

  this.tickTone.connect(this.tickContext.destination);
  this.tickTone.start(0);

	var t = this; 
	setTimeout( function() { 
    t.tickTone.disconnect(t.tickContext.destination);
	}, 100);
}


Sonifier.prototype.speak = function ( msg ) { 
  if ( "undefined" != typeof speechSynthesis ) {
	  if ( speechSynthesis.speaking ) {
	    speechSynthesis.cancel();
	  }
	
		if ( !msg ) {
			msg = "x = " + this.axisX.scale( this.valuePoint.x );
			msg += ", y = " + this.axisY.scale( this.valuePoint.y );
		}
		
		var t = this;
		t.toggleVolume( true );
		if ( t.isPlaying ) {
			t.togglePlay( true );
		}

    var voice = new SpeechSynthesisUtterance();
    voice.text = msg;
    voice.lang = 'en-US';
    voice.rate = 1.2;
		voice.onend = function() { 
			t.toggleVolume(); 
			if ( t.isPlaying ) {
				t.togglePlay();
			}
		}
    speechSynthesis.speak( voice );
  }
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

function Axis(min, max, pos, chartMin, chartMax) {
	if ( arguments.length > 0 ) {
		this.min = min;
		this.max = max;
		this.pos = pos; // position of the axis line along the axis
		this.chartMin = chartMin;
		this.chartMax = chartMax;
	}
}

Axis.prototype.scale = function( val ) {
	var newVal = (val / ((this.chartMax - this.chartMin) / (this.max - this.min))) + this.min;
	newVal = Math.round( newVal * 10 ) / 10;
	return newVal;
};



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

