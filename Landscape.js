
function Landscape(){
	
	var points = this.points = [],
		lines = this.lines = [], 
		stars = this.stars = [],
	 	availableZones = [], 
		// zoneCombis = [], 
		// currentCombi = 0, 
		//zoneInfos = [], 
		landscale = 0.8, 
		rightedge, 
		flickerProgress = 0;
	
		noise.seed(12039);
	setupData(); 
	

	rightedge = this.tileWidth = points[points.length - 1].x * landscale ;
	
	for (var i = 0; i<points.length; i++){
		var p = points[i];
		p.x *= landscale;
		p.y *= landscale;
		//p.y -= 50;
		p.y+=400;
	}
	
	for(var i = 1;i < points.length; i++){
		var p1 = points[i-1];
		var p2 = points[i]; 
		lines.push(new LandscapeLine(p1, p2));
	}

	// make stars... 
	
	for(var i = 0;i < lines.length;i++)	{
		if(Math.random() < 0.1) {
			var line  = lines[i];
			
			var star = { x:line.p1.x, y: Math.random() *600 };
	
			if((star.y < line.p1.y) && (star.y < line.p2.y)) {
				stars.push(star);
			}
		}
	}	

		
	
	var render = this.render = function(c, view) { 

		var offset = 0; 
		
		// figure out the start offset for the lines. 
		// offset is the amount to offset each line so 
		// it's in the right place
		
		while(view.left-offset>rightedge) { 
			offset+=rightedge; 
		}
		
		while(view.left-offset<0) { 
			offset-=rightedge;
		}
		
		// store the start offset so that we can re-use it for 
		// the stars
		
		var startOffset = offset; 
		
		// now figure out where along the landscape data we 
		// should be (i) 
		
		var i = 0; 
		
		while(lines[i].p2.x+offset<view.left) { 
			i++; 
			if(i>lines.length) {
				i=0; 
				offset+=rightedge; 
			}
		}
		
		// draw the lines
		c.beginPath(); 
		
		var line = lines[i];
		var offsetY = 0; 
		// slight wiggliness in the line? 
		// if(Math.random()<0.3) { 
		// 			offset+=(0.2/view.scale); 
		// 			offsetY = (0.2/view.scale); 
		// 		}
		
		c.moveTo(line.p1.x + offset, line.p1.y + offsetY);  
		
	//	var zoneInfoIndex = 0; 
		var multiplierlines = []; 
		// keep going as long as we are within the lines
		while((line = lines[i]).p1.x+offset<view.right) { 
			
			var point = line.p2; 
			c.lineTo(point.x+offset, point.y);
			
			if((counter%20<10) && (line.multiplier!=1)){ 
				var newline = new LandscapeLine(line.p1.clone(), line.p2.clone());
				newline.p1.x+=offset; 
				newline.p2.x+=offset;  
				newline.multiplier = line.multiplier;
				
				multiplierlines.push(newline); 
				
			
			}
			
			i++; 
			if(i>=lines.length) {
				i=0; 
				offset+=rightedge; 
			}
			
	
		}
		
		var flickerAmount = Math.sin(counter*0.8)*0.5 + 0.5; 
		
		if(flickerAmount>0.5) { 
					c.lineWidth = 2/view.scale; 
					var channel = Math.round((flickerAmount-0.5)*(100)); 
				  	c.strokeStyle = "rgb("+channel+","+channel+","+channel+")";
					c.stroke(); 
					
				}	
		c.strokeStyle = '#F0F6FF'; 
		
		
		c.lineWidth = 1/view.scale * (flickerAmount*0.2+0.8); 
		c.lineJoin = 'bevel';
		c.stroke();	
		
		if(view.scale>0.2) { 
			c.textAlign = 'center';
			
			var fontsize = map(view.scale,1,4,12,20,true) /view.scale;
			c.font = fontsize+'px HersheySimplex';

			for(var i = 0; i<multiplierlines.length;i++) { 
				var line = multiplierlines[i]; 
				// c.beginPath(); 
				// c.moveTo(line.p1.x, line.p1.y); 
				// c.lineTo(line.p2.x, line.p2.y); 
				// c.strokeStyle = "hsl("+(i*60)+", 100%, 50%)"; 
				// c.stroke();
				c.fillStyle = "#F0F6FF";
				c.fillText("x"+line.multiplier, line.p1.x + (line.p2.x-line.p1.x)*0.5, line.p1.y+fontsize*1.1); 
			
			}
		}
		
		// draw stars : 
		
			
		i = 0; 
		offset = startOffset;
		
		while(stars[i].x+offset<view.left) { 
			i++; 
			if(i>=stars.length) {
				i=0; 
				offset+=rightedge; 
			}
		}
		
		c.beginPath(); 
		
		while((star = stars[i]).x+offset<view.right) { 
		
			var starx = star.x+offset; 
			var stary = star.y; 
			while(view.bottom<stary) stary-=600; 
			
			c.rect(starx, stary, (1/view.scale),(1/view.scale));
	  		while(stary-600>view.top) { 
				stary-=600; 
				c.rect(starx, stary, (1/view.scale),(1/view.scale));
				
			}
			
			i++; 
			if(i>=stars.length) {
				i=0; 
				offset+=rightedge; 
			}
		
		
		}		
		
		c.stroke(); 
		
	
	};
	
	this.setZones = function () { 
	
		for (var i=0; i<lines.length; i++)
		{
			lines[i].multiplier = 1;
		}	
		var lastX = 0; 
		// go through all the lines
		for (var i=0; i<lines.length; i++){
			var line = lines[i];
			// is the line landable? 
			
			if(line.landable) {
				
				// if yes, how hard? 
				//6 = really hard
				//13 - medium
				//19 - medium easy
				//> 19 = easy
				var multiplier = 1; 
				
				var linewidth = Math.round(line.p2.x-line.p1.x); 
				if(linewidth<=6) { 
					multiplier = (Math.random()<0.5)?8:5; 
				} else if (linewidth<=13) { 
					multiplier = 4;
				} else if (linewidth<=19) { 
					multiplier = 3; 
				} else {
					multiplier = 2; 
				}
				
				if((Math.random()<0.6) && (line.p1.x-lastX>50)) { 
					line.multiplier = multiplier; 
					lastX = line.p1.x;
				}
				
			} 
		}
	
				

		//

		// var combi = zoneCombis[currentCombi];
		// 
		// for (var i = 0; i<combi.length; i++)
		// {
		// 	var zonenumber = combi[i];
		// 	var zone = availableZones[zonenumber];
		// 	line = lines[zone.lineNum];
		// 
		// 	// var zoneLabel : TextDisplay = zoneLabels[i]; 
		// 	// 			zoneLabel.x = line.p1.x + ((line.p2.x - line.p1.x) / 2);
		// 	// 			zoneLabel.y = line.p1.y;
		// 	// 			zoneLabel.text = zone.multiplier + "X";
		// 				
		// 	line.multiplier = zone.multiplier;
		// 
		// }
		// 
		// currentCombi++;
		// if(currentCombi >= zoneCombis.length) currentCombi = 0;
	};


		
	
	function setupData() { 
		
		for(var i = 0; i<2000; i++) { 
			
			var x = i*8; 
		
			var y = (noise.simplex2((x) / 500, 100))*256;

			y +=(noise.simplex2((x) / 200, 100)*80); 
			y +=(noise.simplex2((x) / 40, 100)*20); 
			y = Math.min(y, 150)+200;
			
			if(points.length>1) { 
				var lasty = points[points.length-1].y; 
				var lasty2 = points[points.length-2].y; 
				
				//console.log(y, lasty, lasty2,(y == lasty) && (y == lasty2) );
				if(Math.abs(y-lasty2)<3) { 
					points[points.length-1].x = x; 
					points[points.length-1].y = y; 
					points[points.length-2].y = y; 
				} else if(Math.abs(y-lasty)<2) { 
					
					points[points.length-1].y = y; 
					points.push(new Vector2(x, y)); 
					//points[points.length-2].y = y; 
				}else {
					points.push(new Vector2(x, y)); 
				}
			} else {
				points.push(new Vector2(x, y)); 
			}
			
		
		
		}
		
		//**************************************
				// 
				// 
				// availableZones.push(new LandingZone(0, 4));
				// availableZones.push(new LandingZone(13, 3));
				// availableZones.push(new LandingZone(25, 4));	
				// availableZones.push(new LandingZone(34, 4));	
				// availableZones.push(new LandingZone(63, 5));	
				// availableZones.push(new LandingZone(75, 4));	
				// availableZones.push(new LandingZone(106, 5));	
				// availableZones.push(new LandingZone(111, 2));	
				// availableZones.push(new LandingZone(121, 5));	
				// availableZones.push(new LandingZone(133, 2));	
				// availableZones.push(new LandingZone(148, 3));	
				// 
				// 	
				// zoneCombis.push([2,3,7,9]);
				// zoneCombis.push([7,8,9,10]);
				// zoneCombis.push([2,3,7,9]);
				// zoneCombis.push([1,4,7,9]);
				// zoneCombis.push([0,5,7,9]);
				// zoneCombis.push([6,7,8,9]);
				// zoneCombis.push([1,4,7,9]);	
	
		
		
		
		
	}

	
}; 

function LandscapeLine(p1, p2) { 
	this.p1 = p1; 
	this.p2 = p2; 
	this.landable = (p1.y==p2.y); 
	this.multiplier = 1; 
	
}

function LandingZone(linenum, multi) {
	
	this.lineNum = linenum; 
	this.multiplier = multi; 
}