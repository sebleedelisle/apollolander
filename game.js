
// screen size variables
var SCREEN_WIDTH = window.innerWidth,
	SCREEN_HEIGHT = window.innerHeight,
	HALF_WIDTH = window.innerWidth / 2,
	HALF_HEIGHT = window.innerHeight / 2, 
	touchable = "ontouchstart" in window, 
	touchController, 
	touchThrustTop = 0.25, 
	touchThrustBottom = 0.9,
	touchRotateRange = 0.2,
	touchRotateStartAngle = 0, 
	touchRotate = false, 
	rotateDialBrightness= 0,
	fps = 60, 
	mpf = 1000/fps, 
	counter = 0, 
	gameStartTime = Date.now(), 
	skippedFrames, 
	leftKey = KeyTracker.LEFT, 
	rightKey = KeyTracker.RIGHT, 
	startKey = ' ',
	selectKey = '', 
	abortKey = '',
	startMessage = "APOLLO LANDER<br><br>CLICK OR TOUCH TO PLAY<br>", 
	singlePlayMode = false, // for arcade machine  
	lastMouseMove = Date.now(), 
	lastMouseHide =0, 
	mouseHidden = false, 
	actionRectangle, 
	smoothedRectangle, 
	viewRectangle,
	debug = false; 
	
	if(touchable) touchController= new TouchController();
	
// game states
var	WAITING = 0, 
	PLAYING = 1, 
	LANDED = 2, 
	CRASHED = 3, 
	GAMEOVER = 4,
	
	gameState = GAMEOVER, 
	mouseThrust = false, 
	mouseTop = 0, 
	mouseBottom = 0,
	
	score = 0, 
	time = 0, 
	
	lander = new Lander(),
	landscape = new Landscape(), 
	testPoints = [],
	
	particles = [],
	spareParticles = [], 
	
// canvas element and 2D context
	canvas = document.createElement( 'canvas' ),
	context = canvas.getContext( '2d' ),

// to store the current x and y mouse position
	mouseX = 0, mouseY = 0, 


// to convert from degrees to radians, 
// multiply by this number!
	TO_RADIANS = Math.PI / 180, 
	
	view = {x:0,
			y:0, 
			scale :1, 
			left :0, 
			right : 0, 
			top :0, 
			bottom:0};


window.addEventListener("load", init);


function init() 
{
	if(window["initWebSocket"]) initWebSocket(); 
	// CANVAS SET UP
	
	document.body.appendChild(canvas); 
	
	
	infoDisplay = new InfoDisplay(SCREEN_WIDTH, SCREEN_HEIGHT); 
	document.body.appendChild(infoDisplay.domElement); 
	
	canvas.width = SCREEN_WIDTH; 
	canvas.height = SCREEN_HEIGHT;

	document.body.addEventListener('mousedown', onMouseDown);
	document.body.addEventListener('mousemove', onMouseMove);
	document.body.addEventListener('touchstart', onTouchStart);
	
	KeyTracker.addKeyDownListener(KeyTracker.UP, function() { if(gameState==PLAYING) lander.thrust(1);});
	KeyTracker.addKeyUpListener(KeyTracker.UP, function() { lander.thrust(0);});
	KeyTracker.addKeyDownListener(" ", function() { if(gameState==PLAYING) lander.thrust(1);});
	KeyTracker.addKeyUpListener(" ", function() { lander.thrust(0);});
	
	actionRectangle = new Rectangle(0,0,SCREEN_WIDTH, SCREEN_HEIGHT), 
	smoothedRectangle = new Rectangle(0,0,SCREEN_WIDTH, SCREEN_HEIGHT); 
	viewRectangle = new Rectangle(0,0,SCREEN_WIDTH, SCREEN_HEIGHT); 
	
	window.addEventListener('resize', resizeGame);
	window.addEventListener('orientationchange', resizeGame);
	
	resizeGame();
	restartLevel(); 
	
	loop();
	
}


function sendPosition() {
	if(typeof wsID=="undefined") return; 
	if(gameState==PLAYING) {
		var update = {
			type : 'update', 
			id : wsID, 
			x : Math.round(lander.pos.x*100), 
			y : Math.round(lander.pos.y*100), 
			a : Math.round(lander.rotation), 
			t : lander.thrusting 
		};
					
		sendObject(update); 

	}
}

function sendLanded() { 

	if(typeof wsID=="undefined") return; 
	var update = {
		type : 'land', 
		x : Math.round(lander.pos.x*100), 
		y : Math.round(lander.pos.y*100),
		id : wsID
	};
	sendObject(update); 
}
	
function sendCrashed() { 

	if(typeof wsID=="undefined") return; 
	var update = {
		type : 'crash', 
		x : Math.round(lander.pos.x*100), 
		y : Math.round(lander.pos.y*100), 
		id : wsID	
	};
	sendObject(update); 
}
function sendGameOver() { 

	if(typeof wsID=="undefined") return; 
	var update = {
		type : 'over', 
		x : Math.round(lander.pos.x*100), 
		y : Math.round(lander.pos.y*100), 
		id : wsID,
		sc : score
	};
	sendObject(update); 
}
function sendRestart() { 

	if(typeof wsID=="undefined") return; 
	var update = {
		type : 'restart', 
		id : wsID,
		sc : score
	};
	sendObject(update); 
	sendLocation();
}
	


//

	
function loop() {
	requestAnimationFrame(loop);

	skippedFrames = 0; 
		
	counter++; 
	var c = context; 
	
	var elapsedTime = Date.now() - gameStartTime; 
	var elapsedFrames = Math.floor(elapsedTime/mpf); 
	var renderedTime = counter*mpf; 
		
	if(elapsedFrames<counter) {
			// c.fillStyle = 'green'; 
			// 		c.fillRect(0,0,10,10);
		counter--;
		return; 
	}
	
	while(elapsedFrames > counter) {
		lander.update(); 
		updateView(); 
		
		if((counter%6)==0){
			sendPosition(); 

		}

		counter++; 
	
		skippedFrames ++; 
		if (skippedFrames>30) {
			//set to paused
			counter = elapsedFrames; 
		} 
		

	}
	
	if(gameState == PLAYING) { 
		
		checkKeys(); 
		if(touchable) { 
			if(touchController.rightTouch.touching) { 
				lander.thrust(map(touchController.rightTouch.getY(), SCREEN_HEIGHT*touchThrustBottom, SCREEN_HEIGHT*touchThrustTop, 0,1,true)); 
			} else { 
				lander.thrust(0); 
			}
			
			if(touchController.leftTouch.touching) { 
				
				if(!touchRotate) {
					touchRotate = true; 
					touchRotateStartAngle = lander.rotation; 
				}
				var touchAngle = map(touchController.leftTouch.getXOffset(), SCREEN_WIDTH*touchRotateRange*-0.5, SCREEN_WIDTH*touchRotateRange*0.5, -90,90);
				touchAngle +=touchRotateStartAngle; 
				
				
				lander.setRotation(touchAngle);  
				
			} else { 
				touchRotate = false; 
			}					
		}
	}

	lander.update(); 
	
	if(lander.thrusting) { 
		makeThrustParticles(); 
		
	}
	
	if((counter%6)==0){
		sendPosition(); 
	}
	
	if(gameState == WAITING){
		if(lander.altitude<100)  {
			gameState=GAMEOVER;
			restartLevel();
		} else { 
			lander.vel.x =2;
			lander.pos.y = 150;
			lander.vel.y = 0; 
		}
	}

	if((gameState== PLAYING) || (gameState == WAITING)) 	
		checkCollisions(); 
	
	updateView(); 
	
	updateParticles(); 
	
	render(); 
	
	if((!mouseHidden) && (Date.now() - lastMouseMove >1000)){
		document.body.style.cursor = "none"; 
		lastMouseHide = Date.now();
		mouseHidden = true; 
	}
}

function render() { 
	
	var c = context; 
	c.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

	c.save(); 
	c.scale(view.scale, view.scale); 
	c.translate(-view.x, -view.y);
	
	
	if(debug) { 

		c.globalAlpha = 0.3; 
		// THIS CODE SHOWS THE actionRectangle 
		c.beginPath(); 
		c.moveTo(actionRectangle.getLeft()+2, actionRectangle.getTop()+2); 
		c.lineTo(actionRectangle.getRight()-2, actionRectangle.getBottom()-2); 
		c.strokeStyle = 'blue'; 
		c.lineWidth = 1;
		c.rect(actionRectangle.x, actionRectangle.y, actionRectangle.width,actionRectangle.height); 
		c.stroke();
	
		c.beginPath(); 
		c.moveTo(smoothedRectangle.getLeft()+2, smoothedRectangle.getTop()+2); 
		c.lineTo(smoothedRectangle.getRight()-2, smoothedRectangle.getBottom()-2); 
		c.strokeStyle = 'red'; 
		c.lineWidth = 1;
		c.rect(smoothedRectangle.x, smoothedRectangle.y, smoothedRectangle.width,smoothedRectangle.height); 
		c.stroke();
	
		c.beginPath(); 
		c.moveTo(viewRectangle.getLeft()+2, viewRectangle.getTop()+2); 
		c.lineTo(viewRectangle.getRight()-2, viewRectangle.getBottom()-2); 
		c.strokeStyle = 'green'; 
		c.lineWidth = 1;
		c.rect(viewRectangle.x, viewRectangle.y, viewRectangle.width,viewRectangle.height); 
		c.stroke();
	
		c.beginPath(); 
		c.moveTo(view.left+2, view.top+2); 
		c.lineTo(view.right-2, view.bottom-2); 
		c.strokeStyle = '#F0F6FF'; 
		c.lineWidth = 1;
		c.rect(view.x, view.y, view.width,view.height); 
		c.stroke();
	
		c.globalAlpha = 1; 
	}
	//-------------------------------------------------------------
	
	landscape.render(context, view);
	lander.render(context, view.scale);
	renderParticles(context, view.scale);
	
	if(counter%4==0) updateTextInfo(); 
	
	c.restore();
	
	if(touchable && (gameState== PLAYING)) {
		
		if(touchController.active) { 
		
			context.strokeStyle = '#F0F6FF'; 
			context.lineWidth = 1; 
		
		
			// draws the thrust controls
			var rightX = SCREEN_WIDTH*0.9; 
			if(touchController.rightTouch.getX()!=0) { 
				context.beginPath(); 
				context.moveTo(SCREEN_HEIGHT*touchThrustBottom, rightX); 
				context.lineTo(SCREEN_HEIGHT*touchThrustTop, rightX); 
				for(var i = 0; i<=20;i++) { 
					context.moveTo(rightX-5, map(i, 0, 20, SCREEN_HEIGHT*touchThrustBottom, SCREEN_HEIGHT*touchThrustTop));
					context.lineTo(rightX+5, map(i, 0, 20, SCREEN_HEIGHT*touchThrustBottom, SCREEN_HEIGHT*touchThrustTop));
				}
				
				var indicatorY = map(lander.thrustLevel, 1,0, SCREEN_HEIGHT*touchThrustTop,SCREEN_HEIGHT*touchThrustBottom);
				context.moveTo(rightX-SCREEN_WIDTH*0.1, indicatorY);
				context.lineTo(rightX-5, indicatorY);
				context.moveTo(rightX-5, indicatorY-5);
				context.lineTo(rightX-5, indicatorY+5);
				
				 
				context.stroke(); 
				
				
				context.beginPath(); 
				context.arc(rightX-SCREEN_WIDTH*0.12, indicatorY, SCREEN_WIDTH*0.01, 0, Math.PI*2, true); 
				context.stroke();
			
			}
			
			//draws rotation controls 
			if(touchController.leftTouch.getX()!=0) { 
				
				if(touchController.leftTouch.touching) rotateDialBrightness = 100; 
				else rotateDialBrightness *=0.95; 
				context.beginPath(); 
				context.strokeStyle = "hsl(0,0%,"+rotateDialBrightness+"%)"; 
				
				for(var i= -180; i<=0; i+=10) { 
					
					context.save(); 
					context.translate(touchController.leftTouch.getX(), touchController.leftTouch.getY()); 
					context.rotate(i*Math.PI/180); 
					context.moveTo(55,0); 
					context.lineTo(60,0); 
					context.restore(); 
					
				}
				
				context.save(); 
				context.translate(touchController.leftTouch.getX(), touchController.leftTouch.getY());
				
				
				context.moveTo(80,-10); 
				context.lineTo(90,0); 
				context.lineTo(80,10); 
				context.closePath(); 
				
				context.moveTo(-80,-10); 
				context.lineTo(-90,0); 
				context.lineTo(-80,10); 
				context.closePath(); 
				
				context.rotate((lander.rotation-90)*Math.PI/180); 
			
				context.moveTo(70,-7); 
				context.lineTo(77,0); 
				context.lineTo(70,7); 
				context.closePath(); 


				
				
				context.restore();
				
				
				context.stroke(); 
				
			}
			
		}
	}
}

function checkKeys() { 
	
	if((KeyTracker.isKeyDown(leftKey))||(KeyTracker.isKeyDown(KeyTracker.LEFT))) {
		lander.rotate(-1);	
	} else if((KeyTracker.isKeyDown(rightKey))||(KeyTracker.isKeyDown(KeyTracker.RIGHT))) {	
		lander.rotate(1); 
	}
	if(KeyTracker.isKeyDown(abortKey)) { 
		lander.abort();
	}
	
	// SPEED MODE! 
	if(KeyTracker.isKeyDown('S')) { 
		for(var i=0; i<3;i++) lander.update();
	}
	
}


function updateView() 
{
	
	var top,bottom,left,right;
	
	var altitude = lander.altitude;
	
	// y position of the land under the lander
	var landY = lander.pos.y+altitude; 
	
	// set the bottom to the landscape level
	bottom = landY;
		
	// and the top to the lander y position
	top = lander.pos.y; 

	// the left and right to the lander's position
	left = lander.pos.x; 
	right = lander.pos.x;
					
	// set up the action rectangle width and position
	actionRectangle.x = left; 
	actionRectangle.y = top; 
	actionRectangle.width = right - left; 

	// and the height to be the distance from lander to land
	actionRectangle.height = bottom-top; 
	
	// at this point the action rectangle tightly surrounds the lander and the top of the land directly under it 

	// add padding relative to the size of the rectangle, with a minimum
	var verticalpadding = clamp(actionRectangle.height*0.2, 20, 200); 
	var horizpadding = clamp(actionRectangle.width*0.2, 20, 80); 

	// and apply it to the rectangle's height; 
	actionRectangle.y -= verticalpadding; 
	actionRectangle.height +=verticalpadding*2;

	// this is the lowest point in the landscape, 
	var landscapebottom = 750;
	
	// if we're in a waiting state, be sure to include all the landscape to the bottom
	if(gameState == WAITING) { 
		actionRectangle.setBottom(landscapebottom);
		actionRectangle.setTop(50);
	}

	actionRectangle.x -=horizpadding; 
	actionRectangle.width += horizpadding*2; 
	
	// if we're in an "orbit" height, or we're lower than the bottom, make sure to show the bottom
	if(((lander.pos.y<200)&&(lander.pos.y>-200))||(actionRectangle.getBottom() > landscapebottom)) {
		actionRectangle.setBottom(landscapebottom); 
	}			
	
	if(actionRectangle.height>2000) actionRectangle.height = 2000; 
					
	var speed = 0.015;//0.01; 
	smoothedRectangle.setLeft(smoothedRectangle.x + ((actionRectangle.x - smoothedRectangle.x)*speed)); 
	smoothedRectangle.setTop(smoothedRectangle.y + ((actionRectangle.y - smoothedRectangle.y)*speed)); 
	smoothedRectangle.setRight(smoothedRectangle.getRight() +  ((actionRectangle.getRight() - smoothedRectangle.getRight())*speed)); 
	smoothedRectangle.setBottom(smoothedRectangle.getBottom() + ((actionRectangle.getBottom() - smoothedRectangle.getBottom())*speed)); 
	
	if(Math.abs(smoothedRectangle.x-actionRectangle.x)>500) { 
		smoothedRectangle.x = actionRectangle.x; 
		smoothedRectangle.y = actionRectangle.y; 
		smoothedRectangle.width = actionRectangle.width; 
		smoothedRectangle.height = actionRectangle.height; 
	}
	
	// fix aspect ratio
	viewRectangle.x = smoothedRectangle.x; 
	viewRectangle.y = smoothedRectangle.y; 
	viewRectangle.width = smoothedRectangle.width; 
	viewRectangle.height = smoothedRectangle.height; 

	var screenratio = SCREEN_WIDTH/SCREEN_HEIGHT; 
	var actionratio = viewRectangle.width/viewRectangle.height; 
	
	// landscape shaped screens (will mostly be this one)
	if(screenratio>actionratio) { 
	
		var newwidth = viewRectangle.height * screenratio; 
		var midx = (viewRectangle.x + (viewRectangle.width/2)); 
		var newx = midx - newwidth/2; 
	
		var diff = viewRectangle.x - newx;
		//if(newx<0) 
		viewRectangle.x -= diff*0.8; 
		//else viewRectangle.x = newx; 
		
		viewRectangle.width = newwidth; 
		
	} else { 
		
		// very tight portrait screens
		var newheight = viewRectangle.width / screenratio; 
		var midy = (viewRectangle.y +(viewRectangle.height/2)); 
		var newy = midy - newheight/2; 
		viewRectangle.y = newy; 
		viewRectangle.height = newheight; 
		
	} 
	
	view.x = viewRectangle.getLeft(); 
	view.y = viewRectangle.getTop(); 

	view.scale = SCREEN_WIDTH/viewRectangle.width; 
	
	
	view.left = view.x; 
	view.top = view.y; 
	view.right = view.left + (SCREEN_WIDTH/view.scale); 
	view.bottom = view.top + (SCREEN_HEIGHT/view.scale); 
	view.width = view.right-view.left; 
	view.height = view.bottom-view.top; 
	
	

}



function setLanded(line) { 
	
	multiplier = line.multiplier; 

	lander.land(); 
	
	var points = 0; 
	if(lander.vel.y<0.075) { 
		points = 50 * multiplier; 
		// show message - "a perfect landing"; 
		infoDisplay.showGameInfo("YOU DID IT!\nPERFECT LANDING\n" + points + " POINTS");
		lander.fuel+=50;
	} else {
		points = 15 * multiplier; 
		// YOU LANDED HARD
		infoDisplay.showGameInfo("HARD LANDING<br>YOU ARE STRANDED<br>" + points + " POINTS");
		lander.makeBounce(); 
	}
	
	score+=points; 

	// TODO Show score
	gameState = LANDED; 
	//ARCADE AMENDMENT
	if(singlePlayMode) {
		setGameOver();
	}
	sendLanded();
	scheduleRestart(); 
}

function setCrashed() { 
	lander.crash(); 
	
	// show crashed message
	// subtract fuel
	
	var fuellost = Math.round(((Math.random() * 200) + 200));
	lander.fuel -= fuellost;

	sendCrashed();  
	
	if(lander.fuel<1) { 
		setGameOver(); 
		msg = "OUT OF FUEL<br><br>GAME OVER";
		
	} else {
		var rnd  = Math.random();
		var msg ='';
		if(rnd < 0.3){
			msg = "LUNAR MODULE DESTROYED";
		} else  if(rnd < 0.6){
			msg = "CRAFT LOSS DUE TO HUMAN ERROR";
		} else {
			msg = "LOSS OF SIGNAL";
		}
		
		msg = "FUEL PENALTY<br>-" + fuellost + "<br><br>" + msg;
		gameState = CRASHED;
		//ARCADE AMENDMENT
		if(singlePlayMode) {
			setGameOver()
		}
	
		
	}
		
	infoDisplay.showGameInfo(msg);
	
	
	scheduleRestart(); 
	
	samples.explosion.play(); 
}


function setGameOver() { 
	
		gameState = GAMEOVER; 
		sendGameOver();
}

function onMouseDown(e) {
	e.preventDefault(); 
	if(gameState==WAITING) newGame(); 
}

function onTouchStart(e) { 
	e.preventDefault(); 
	if(gameState==WAITING) newGame();

}

function newGame() { 
	
	lander.fuel = 1000;

	time = 0;
	score = 0;
	
	gameStartTime = Date.now(); 
	counter = 0; 

	restartLevel();
	
}

function scheduleRestart() { 
	setTimeout(restartLevel,4000); 
	
}
function restartLevel() { 
	lander.reset();
	lander.scale = 0.25; 
	lander.pos.x = randomRange(0,landscape.tileWidth);  
	landscape.setZones(); 
	//setZoom(false); 
	
	if(gameState==GAMEOVER) { 
		gameState = WAITING; 
		showStartMessage(); 
		lander.vel.x = 2; 
		
		
		//initGame(); 
	} else {
		gameState = PLAYING; 
		sendRestart(); 
		infoDisplay.hideGameInfo();
	}
	
	
}
function checkCollisions() { 
	
	var lines = landscape.lines, 
		right = lander.right%landscape.tileWidth, 
		left = lander.left%landscape.tileWidth;
		
		while(right<0){ 
			right+=landscape.tileWidth; 
			left += landscape.tileWidth; 
		}

		
	for(var i=0; i<lines.length; i++ ) { 
		line = lines[i]; 
		line.checked = false; 
		// if the ship overlaps this line
		if(!((right<line.p1.x) || (left>line.p2.x))){ 
		
			lander.altitude = line.p1.y-lander.bottom; 
				line.checked = true;
			
			// if the line's horizontal 
			if(line.landable) { 
				// and the lander's bottom is overlapping the line
				if(lander.bottom>=line.p1.y) { 
					
					// and the lander is completely within the line
					if((left>line.p1.x) && (right<line.p2.x)) {
						
						// and we're horizontal and moving slowly
						if((lander.rotation==0) && (lander.vel.y<0.15)) {
							setLanded(line);
						} else {
							setCrashed(); 
						} 
					} else {
						// if we're not within the line
						setCrashed(); 
					}
				}
				// if lander's bottom is below either of the two y positions
			} else if(( lander.bottom > line.p2.y) || (lander.bottom > line.p1.y)) {
				lander.bottomRight.x = right; 
				lander.bottomLeft.x = left; 
			
				if( pointIsLessThanLine(lander.bottomLeft, line.p1, line.p2) || 	
						pointIsLessThanLine(lander.bottomRight, line.p1, line.p2)) {
				
					setCrashed(); 
				}
			}
		}
	}	
	
};


function pointIsLessThanLine(point, linepoint1, linepoint2) {

	// so where is the y of the line at the point of the corner? 
	// first of all find out how far along the xaxis the point is
	var dist = (point.x - linepoint1.x) / (linepoint2.x - linepoint1.x);
	var yhitpoint  = linepoint1.y + ((linepoint2.y - linepoint1.y) * dist);

	return ((dist > 0) && (dist < 1) && (yhitpoint <= point.y)) ;
}

function updateTextInfo() {
	
	infoDisplay.updateBoxInt('score', score, 4); 
	infoDisplay.updateBoxInt('fuel', lander.fuel, 4); 
	if(gameState == PLAYING) infoDisplay.updateBoxTime('time', counter*mpf); 
	
	infoDisplay.updateBoxInt('alt', (lander.altitude<0) ? 0 : lander.altitude, 4); 
	infoDisplay.updateBoxInt('horizSpeed', (lander.vel.x*200)); 	
	infoDisplay.updateBoxInt('vertSpeed', (lander.vel.y*200)); 	

	if((lander.fuel < 300) && (gameState == PLAYING)) {
		if((counter%50)<30) { 
			var playBeep; 
			if(lander.fuel <= 0) {
				playBeep = infoDisplay.showGameInfo("Out of Fuel"); 
			} else {
				playBeep = infoDisplay.showGameInfo("Fuel Low");
			} 
			if(playBeep) samples.beep.play(); 
		} else {
			infoDisplay.hideGameInfo(); 
		}
		
		
	}

}

function showStartMessage() {
	infoDisplay.showGameInfo(startMessage);
}

// returns a random number between the two limits provided 
function randomRange(min, max){
	return ((Math.random()*(max-min)) + min); 
}

function clamp(value, min, max) { 
	return (value<min) ? min : (value>max) ? max : value; 
}

function map(value, min1, max1, min2, max2, clamp) { 
	clamp = typeof clamp !== 'undefined' ? clamp : false;
	
	
	if(clamp) {
		if(min1>max1) { 
			var tmp = min1; 
			min1 = max1;
			max1 = tmp; 
			tmp = min2; 
			min2 = max2; 
			max2 = tmp;  
			
		}
		if (value<=min1) return min2; 
		else if(value>=max1) return max2; 
	}
	
	
	return (((value-min1)/(max1-min1)) * (max2-min2))+min2;
}


function onMouseMove( event ) 
{
	mouseX = ( event.clientX - HALF_WIDTH );
	mouseY = ( event.clientY - HALF_HEIGHT );
	if((mouseHidden) && (Date.now() - lastMouseHide> 400)){
		document.body.style.cursor = "default"; 
		
		mouseHidden = false; 
	}
	lastMouseMove = Date.now(); 
}
	
function resizeGame (event) { 
	
	var newWidth = window.innerWidth; 
	var newHeight = window.innerHeight; 
	
	if((SCREEN_WIDTH== newWidth) && (SCREEN_HEIGHT==newHeight)) return; 
	if(touchable) window.scrollTo(0,-10); 
	
	SCREEN_WIDTH = canvas.width = newWidth; 
	SCREEN_HEIGHT = canvas.height = newHeight; 
	
	infoDisplay.arrangeBoxes(SCREEN_WIDTH, SCREEN_HEIGHT); 

}

function makeThrustParticles() { 
	var vel = new Vector2(0,1); 
	vel.rotate(lander.rotation+randomRange(-7,7)); 
	var pos = lander.pos.clone();
	offset = vel.multiplyNew(2.7);  
	pos.plusEq(offset); 
	vel.multiplyEq(randomRange(0.1,0.6)); 
	vel.plusEq(lander.vel);
	
	var particle = getNewParticle(pos, vel); 
	

	
}

function getNewParticle(pos, vel) { 
	var particle; 
	
	if(spareParticles.length>0) {
		particle = spareParticles.shift(); 
		particle.reset(pos,vel); 
	} else { 
		particle = new Particle(pos, vel); 
		particles.push(particle);
	}
	return particle; 
}
function updateParticles() { 
	for(var i = 0; i<particles.length; i++) { 
		var p = particles[i]; 
		
		p.update(); 
		if(p.life>10) {
			p.active = false;
			spareParticles.push(p); 
		} 
}
	}

function renderParticles(c, scale) { 
	
	for(var i = 0; i<particles.length; i++) { 
		var p = particles[i]; 
		
		p.render(c,scale); 
	}
	
}


function Rectangle(x, y, width, height) { 
	
	this.x = x; 
	this.y = y; 
	this.width = width; 
	this.height = height; 
	
	this.getBottom = function() { 
		return this.y+this.height; 
	}
	this.getLeft = function () { 
		return this.x; 
	}
	this.getRight = function () { 
		return this.x+this.width; 
	}
	this.getTop = function() { 
		return this.y; 
	}
	this.setBottom = function(bottom) { 
		this.height = bottom - this.y; 
	}
	this.setRight = function (right){ 
		this.width = right - this.x; 
	}
	this.setTop = function(top) { 
		this.height -= (top-this.y); 
		this.y = top; 
	}
	this.setLeft = function(left) { 
		this.width -= (this.x-left); 
		this.x = left; 
	}
	
}

function Particle(_pos,_vel) { 
	
	var pos = this.pos = _pos.clone(); 
	var vel = this.vel = _vel.clone(); 
	this.life = 0; 
	this.active = true; 
	
	this.reset = function(_pos, _vel){
		pos.copyFrom(_pos); 
		vel.copyFrom(_vel); 
		this.life = 0; 
		this.active = true;
	}
	
	this.update = function() { 
		if(!this.active) return; 
		pos.plusEq(vel); 
		this.life++;
	}
	this.render = function(c, scale) { 
		if(!this.active) return; 
		c.save(); 
		c.translate(pos.x, pos.y); 
		//console.log("particle.render", pos,c)
		var s = map(scale,3,5, 1,1.7,true)/scale;  
		c.scale(s,s); 
		//c.scale(0.5,0.5); 
		c.fillStyle = "white";//"#F0F6FF"; 
		c.fillRect(-0.5,-0.5,1,1); 
		c.restore(); 
		
	}
	
}
