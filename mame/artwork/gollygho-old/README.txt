coordinates in gollygho.art are only approximate

the #open.png images are all bigger than they need to be; they include whole rooms, 
instead of just the parts that visibly change when a door/chest opens.

ledpanel.png is currently just a placeholder.
We'll eventually need graphics for the actual LED segments, to be managed by the driver.


-----------------------------

Updates (Dec. 3)

Everything is done now besides the dark picture (fulldark.png). Also it may need 
some tweaking once it's added, the items don't match up perfectly to allclosed.png.
Another option is creating a new fulldark.png pic from allclosed.png. That way 
matching up would be easy. Also the LED off positions aren't currently used. I'm 
not sure what the best way is to support them. Maybe I could edit the existing pics
to have whatever off parts included with them and x.png's could be used when nothing
is displayed? Anyways, if more images need to be made, let me know. 

-Smitdogg

-----------------------------

Updates (Dec. 7)

-Darkened the steel supports between rooms to not be visible as per info from Guru.
-Made a new fulldark image that lines up to allclosed perfectly, it's in the .art
file commented out until it's supported. Also its brightness is currently set to .6,
this may need to be adjusted later. It should barely be visible at all, but I can't 
test it currently.
-Fixed the LED pics to have off positions, deleted unused "x" pics, adjusted their 
size and position to be more like some pics Guru took, and adjusted the LED panel.
-artres 2 is pretty much a requirement for this game it seems if you want the LEDs, 
etc. to look correct
