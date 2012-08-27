// Imports
import controlP5.*;
//import gifAnimation.*;

// Objects
ControlP5 cp5;
Element[] elements = new Element[118];
HashMap layouts = new HashMap();
Time now = new Time(1, -35);
Layout current_layout;
Layout unfocused_layout;
Transition trans;
RegressionType regressionType;

// Data boundaries
int min_halflife_exp = 0;
int max_halflife_exp = 0;
int absolute_max_protons  = 0;
int absolute_max_neutrons = 0;
int max_neutron_spread = 0;

// Display stuff
int stored_width  = 0;
int stored_height = 0;
int margin = 20;
float cell_padding = 0;
int focus_atomic_number = 0;
boolean same_stroke = false;

// Status booleans
boolean in_transition = false;

// Mouse position relative to specific nuclide
int hover_protons  = -1;
int hover_neutrons = -1;

/**
  Setup() :: parse data, further define some globals
*/
void setup() {

  // Display - 75% of total display area, resizable
  size(floor(screen.width*0.75), floor(screen.height*0.75));
  if (frame != null){ frame.setResizable(true); }
  
  // Slurp in data
  elements[0] = new Element(0,1,0);
  parseElements("data/elements.csv");
  parseNuclides("data/nuclides.csv");
  
  // Layouts and Transitions
  createLayouts();
  trans = new Transition( (Layout) layouts.get("standard") );
  
  // Initialize GUI controls class
  cp5 = new ControlP5(this);
  
}

void draw() {
  
  background(0);
  
  // If resizing has occurred (or this is the first draw), redraw everything
  if (width != stored_width || height != stored_height){
    // Update stored dimensions
    stored_width  = width;
    stored_height = height;
    // Redraw slider and reload layouts
    addTimeSlider();
    createLayouts();
    // Kill any transition in progress and transition into current layout, resized
    trans.addTarget( (Layout) layouts.get(trans.source.name()) );
    trans.reset();
    in_transition = true;
  }
  
  // Run transition
  if (in_transition) {
    trans.stepForward(4);
    if (trans.percentage == 100){
      in_transition = false;
    } else {
      showProgress(float(trans.percentage)/100);
    }
  }
  
  // Reset mouse hover values
  hover_protons  = -1;
  hover_neutrons = -1;
  
  // Display the elements!
  for (int e = 0; e < elements.length; e = e+1) {
    elements[e].display();
  }
  
}


//Simple control scheme  
void keyPressed() {
  
  String newLayout = null;
  
  switch (key) {
     case '1':
        newLayout = "standard";
        break;
     case '2':
        newLayout = "periodic";
        break;
     case '3':
        newLayout = "periodic2";
        break;
     case '4':
        newLayout = "crunched";
        break;       
     case '5':
        newLayout = "linear";
        break;
     case '6':
        newLayout = "poly2";
        break;
     case '7':
        newLayout = "poly3";
        break;
     case '8':
        newLayout = "exponential";
        break;
     case '9':
        newLayout = "logarithmic";
        break;
     case '0':
        newLayout = "power";
        break;
     case 'q':
        newLayout = "stacked";
        break;
     case 'w':
        newLayout = "radial";
        break;
     case 'a':
        newLayout = "periodicdetailed";
        break;
     case 'd':
        cp5.getController("timeSlider").setValue(now.exponent+1);
        break;
     case 'r':
        cp5.getController("timeSlider").setValue(now.exponent-1);
        break;
     case 'g':
        same_stroke = !same_stroke;
        break;
     case '+':
        cell_padding += 0.5;
        break;
     case '-':
        cell_padding -= 0.5;
        break;
     case '=':
        cell_padding = 0;
        break;
     /*
     case 'e':  //export an animated gif
        exportGif();
        break;
     */
  }
  
  if (newLayout != null){
    trans.addTarget( (Layout) layouts.get(newLayout) );
    trans.reset();
    in_transition = true;
    println("selected layout: " + newLayout);
  }
  
}

// Mouse control
void mouseClicked(){
  if (hover_protons > -1){
    trans.addTarget( (Layout) layouts.get("oneelement") );
    trans.reset();
    in_transition = true;
    focus_atomic_number = hover_protons;
    println("Highlighting element: "+elements[hover_protons].name);
    // Add back button and store unfocused layout
    unfocused_layout = trans.source;
    cp5.addButton("Back")
       .setPosition(width - 50 - margin, height - 20 - margin)
       .setSize(50,20);
  }
}

void addTimeSlider(){
  float slider_value = min_halflife_exp - 1;
  if (cp5.getController("timeSlider") != null){
    slider_value = cp5.getController("timeSlider").getValue();
    cp5.getController("timeSlider").remove();
  }
  cp5.addSlider("timeSlider")
     .setPosition(margin,margin)
     .setSize(width-(2*margin),12)
     .setRange(min_halflife_exp-1,max_halflife_exp+6)
     .setDefaultValue(min_halflife_exp-1)
     .setValue(slider_value)
     .setCaptionLabel("Elapsed Time")
     .setNumberOfTickMarks(max_halflife_exp-min_halflife_exp+8)
     .showTickMarks(true)
     .snapToTickMarks(true);
  cp5.getController("timeSlider").getValueLabel().align(ControlP5.LEFT, ControlP5.BOTTOM_OUTSIDE).setPaddingX(0).setPaddingY(12);
  cp5.getController("timeSlider").getCaptionLabel().align(ControlP5.RIGHT, ControlP5.BOTTOM_OUTSIDE).setPaddingX(0).setPaddingY(12);
}

void timeSlider(float value) {
  now.exponent = round(constrain(value,min_halflife_exp-1,max_halflife_exp+6));
  cp5.getController("timeSlider").setValueLabel(now.humanReadable());
  //println(now.humanReadable());
}

void showProgress(float value) {
  fill(255); stroke(255);
  rect(0, height - 3, float(width) * value, 3);
}

void controlEvent(ControlEvent theEvent) {
  if (theEvent.isController()) { 
    if (theEvent.controller().name() == "Back") {
      println("returning to layout: " + unfocused_layout.name());
      trans.addTarget( unfocused_layout );
      trans.reset();
      in_transition = true;
      cp5.getController("Back").remove();
    }
  }
}
