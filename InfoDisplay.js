function InfoDisplay(width, height) { 

	var dom = this.domElement = document.createElement('div'); 
	var s = dom.style; 
	s.position = 'absolute';
	s.top = '0px';

	
	var w = width,
		h = height, 
		LEFT = 0, 
		CENTRE = 1, 
		RIGHT = 2; 
	
	
	var scoreLabel = makeInfoBox("Score"),
		timeLabel = makeInfoBox("Time", LEFT),
		fuelLabel = makeInfoBox("Fuel"), 
		score = this.score = makeInfoBox("0000"), 
		time = this.time = makeInfoBox("0:00", RIGHT), 
		fuel = this.fuel = makeInfoBox("0000"),
		
		altLabel = makeInfoBox("Alt"),
		horizSpeedLabel = makeInfoBox("X Velocity", LEFT, 250),
		vertSpeedLabel = makeInfoBox("Y Velocity", LEFT, 250),
		
		alt = this.alt = makeInfoBox("000"),
		horizSpeed = this.horizSpeed = makeInfoBox("000", RIGHT),
		vertSpeed = this.vertSpeed = makeInfoBox("000", RIGHT), 
		
		messages = this.messages = makeInfoBox("TEST", CENTRE, 300) ;
		messages.domElement.className = "titleBox";
		  
	this.arrangeBoxes = arrangeBoxes; 
	
	
	arrangeBoxes(w,h); 
	
	function makeInfoBox(text, align, width) { 
		
			var infobox = new InfoBox(align, width); 
			dom.appendChild(infobox.domElement); 
			infobox.setText(text); 
			
		
			return infobox;
	}
	
	function arrangeBoxes(width, height) { 
		w = width; 
		h = height; 
		
		var leftMargin = Math.min(50, width/12), 
			topMargin = Math.max(20, height*0.02), 
			bottomMargin = height-80,//Math.max(height-80, height/12*10), 
			rightMargin = w-Math.min(50, width/10), 
			vSpace = 20, 
			column2Left = leftMargin+((SCREEN_WIDTH<650)?46:80), 
			column3Left = rightMargin- ((SCREEN_WIDTH<650)?90:200);  
		
		scoreLabel.setX(leftMargin);
		score.setX(column2Left);
		timeLabel.setX(rightMargin- ((SCREEN_WIDTH<650)?70:130)  );
		time.setX(rightMargin);
		
		fuelLabel.setX(leftMargin);
		
		fuel.setX(column2Left);
		
		altLabel.setX(leftMargin); 
		horizSpeedLabel.setX(column3Left); 
		vertSpeedLabel.setX(column3Left); 
		
		alt.setX(column2Left); 
		horizSpeed.setX(rightMargin); 
		vertSpeed.setX(rightMargin); 
	
		var ypos = bottomMargin; 
	
		scoreLabel.setY(topMargin); 
		score.setY(topMargin);
		timeLabel.setY(topMargin);
		time.setY(topMargin); 
		 
	
		
		ypos+=vSpace; 
		
		altLabel.setY(ypos); 
		alt.setY(ypos);

		horizSpeedLabel.setY(ypos); 
		horizSpeed.setY(ypos); 
		
		ypos+=vSpace; 
		
		fuelLabel.setY(ypos); 
		fuel.setY(ypos); 
		
		vertSpeedLabel.setY(ypos); 
		vertSpeed.setY(ypos);
		
		messages.setX(width/2); 
		messages.setY(height/3); 
		
		document.body.style.fontSize = '50%'; 

	}
	
	
	this.showGameInfo = function(msg) { 
		
		messages.show(); 
		return messages.setText(msg); // returns true if message was changed.
		
	};
	this.hideGameInfo = function () { 
		messages.setText(''); 
		messages.hide(); 
		
	};
	
	this.updateBoxInt = function(boxname, value, padding) { 
	
		value = Math.floor(value); 
	
		if(padding>0) { 
			value = ''+value;
			while((value.length===undefined) || (value.length<padding)) {
				value = '0'+value; 
			}
			
		}
		
		if(this[boxname]) {
			this[boxname].setText(value); 
		}
		
	};
	
	this.updateBoxTime = function(boxname, value) { 
	
		value = Math.floor(value); 
		
		secs = Math.floor(value/1000); 
		mins = Math.floor(secs/60);
		secs = secs%60; 
		if(secs<10) secs = "0"+secs; 

		this[boxname].setText(mins+":"+secs); 
		
		
	};
}

function InfoBox(align, width) { 
	
	width = (typeof width !== 'undefined') ? width : 200; 
	
	var dom = this.domElement =  document.createElement('div'), 
		content = '';
		 
	this.hidden = false; 
		
	dom.style.position = 'absolute';
	dom.style.color = '#F0F6FF';
	dom.style.width = width+'px';
	dom.style.display = 'block';
	dom.className = 'infoBox';
	
	if(align == 2) dom.style.textAlign = 'right';
	else if(align == 1) dom.style.textAlign = 'center';
	
	this.setText = function(text) { 
		if(text!=content) {
			content = text; 
			dom.innerHTML = text; 
			return true; 
		} else  { 
			return false; 
		}
		
	};
	this.setX = function(x) { 
		if(align == 2) x-=width; 
		else if(align ==1) x-=width/2; 
		
		dom.style.left = x+'px';
	};
	this.setY = function(y) { 
		dom.style.top = y+'px';		
	};
	
	this.hide = function() { 
		if(!this.hidden) 
			dom.style.display = 'none'; 
		this.hidden = true; 
		
	};

	this.show = function() { 
		if(this.hidden) 
			dom.style.display = 'block'; 
		this.hidden = false; 
		
	};

}

