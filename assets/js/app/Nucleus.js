"use strict";

var Nucleus = function(nuclide, id){

    if (typeof nuclide != "object"){ return; }

    // ID is required to render so seed all instances with a random ID if one isn't passed
    if (typeof id != "undefined"){
        this.id = id.toString();
    } else {
        this.id = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + Date.now();
    }

    this.selector = null;
    this.nucleons_selector = null;
    this.ejecta_selector = null;

    this.nuclide = nuclide;
    this.particles = {};
    this.width_sum = 0;
    this.force = null;
    this.gravity = 0.8;
    this.collide = null;

    (function(nucleus){
        
        nucleus.particles = {};
        for (var p = 0; p < nucleus.nuclide.protons; p++){
            nucleus.add(new Proton());
        }
        for (var n = 0; n < nucleus.nuclide.neutrons; n++){
            nucleus.add(new Neutron());
        }

        nucleus.collide = function(alpha){
            var quadtree = d3.geom.quadtree(nucleus.particlesArray());
            return function(d) {
                var r = d.circle.r * 1.7,
                nx1 = d.x - r,
                nx2 = d.x + r,
                ny1 = d.y - r,
                ny2 = d.y + r;
                quadtree.visit(function(quad, x1, y1, x2, y2) {
                    if (quad.point && (quad.point !== d)) {
                        var x = d.x - quad.point.x,
                            y = d.y - quad.point.y,
                            l = Math.sqrt(x * x + y * y),
                            r = (d.circle.r + quad.point.circle.r) - 6.28 * Math.abs(d.circle.r - quad.point.circle.r);
                        if (l < r && l != 0) {
                            l = (l - r) / l * alpha;
                            d.x -= x *= l;
                            d.y -= y *= l;
                            quad.point.x += x;
                            quad.point.y += y;
                        }
                    }
                    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
                });
            };
        };

    })(this);

    return this;

};

Nucleus.prototype._settableAttributes = { id: "string",
                                          gravity: "float" };

Nucleus.prototype.attr = function(attr, value){
    if (typeof this._settableAttributes[attr] == "undefined"){
        console.log("Particle error: " + attr + " is not a valid attribute");
        return;
    }
    if (typeof value == "undefined"){
        return this[attr];
    } else {
        switch (this._settableAttributes[attr]){
        case "int":
            this[attr] = parseInt(value);
            break;
        case "float":
            this[attr] = parseFloat(value);
            break;
        case "string":
            this[attr] = value.toString();
            break;
        default:
            this[attr] = value;
            break;
        }
        return this;
    }
};

Nucleus.prototype.add = function(particle){
    this.particles[particle.id] = particle;
    this.width_sum += particle.circle.r;
    return this.particles[particle.id];
}

Nucleus.prototype.remove = function(particle){
    d3.select("#" + particle.id).remove();
    this.width_sum -= particle.circle.r;
    delete this.particles[particle.id];
}

Nucleus.prototype.particlesArray = function(){
    var nucleus = this;
    return Object.keys(nucleus.particles).map(function (key) {return nucleus.particles[key]});
}

Nucleus.prototype.appendTo = function(parentSelector){
    this.selector = parentSelector.append("g").attr("id", this.id);
    this.nucleons_selector = this.selector.append("g");
    this.ejecta_selector = this.selector.append("g");
    this.restart();
    return this;
};

Nucleus.prototype.restart = function(){
    (function(nucleus){
        var dim = Math.sqrt(nucleus.width_sum);
        nucleus.force = d3.layout.force()
            .nodes(nucleus.particlesArray()).links([])
            .size([dim, dim]).charge(-0.2).gravity(nucleus.gravity).friction(0.5);
        nucleus.nucleons_selector.selectAll("circle")
            .data(nucleus.particlesArray()).enter().append("circle")
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
            .attr("id", function(d) { return d.id; })
            .attr("r", function(d) { return d.circle.r; })
            .attr("fill", function(d) { return d.circle.fill; })
            .attr("stroke", function(d) { return d.circle.stroke; })
            .style("stroke-width", function(d) { return d.circle.stroke_width; })
            .call(nucleus.force.drag);
        nucleus.force.on("tick", function(e) {
            nucleus.nucleons_selector.selectAll("circle")
                .each(nucleus.collide(.5))
                .attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });
        });
        nucleus.force.start();
    })(this);
}

Nucleus.prototype.alphaDecay = function(){
    // Start with the first particle in the nucleus
    var first = this.particlesArray()[0];
    // Build a ranked list of particles in ascending order of distance from the first particle
    var ranked = [];
    var quadtree = d3.geom.quadtree(this.particlesArray().slice(1));
    quadtree.visit(function(node, x1, y1, x2, y2) {
        if (!node.leaf){ return; }
        var distance = Math.sqrt(Math.pow(first.px - node.point.px, 2) + Math.pow(first.py - node.point.py, 2));
        ranked.push({ particle: node.point, distance: distance });
    });
    ranked.sort(function(a, b){ return a.distance-b.distance; });
    // Build an alpha particle from the closest particles
    var alpha_contents = { proton: (first.type == "proton" ? 1 : 0), neutron: (first.type == "neutron" ? 1 : 0) };
    var alpha_nucleons = [first];
    var index = 1;
    while (alpha_contents.proton < 2 || alpha_contents.neutron < 2){
        if (alpha_contents[ranked[index].particle.type] < 2){
            alpha_nucleons.push(ranked[index].particle);
            alpha_contents[ranked[index].particle.type]++;
        }
        index++;
        if (index >= ranked.length){
            console.log("Unable to alpha decay nucleus; not enough protons and neutrons found!");
            break;
            return;
        }
    }

    // Pop the alpha nucleons out of existence and pop a Helium-4 nucleus into existence on the same spot to be ejected
    var alpha_id = this.id + "_alpha_" + Date.now();
    var alpha_particle = new Nucleus(matter.elements[2].nuclides[2])
        .attr("id",alpha_id).attr("gravity",3).appendTo(this.ejecta_selector);
    d3.select("#"+alpha_id).attr("transform","translate(" + first.px + "," + first.py + ")");
    for (var n in alpha_nucleons){
        this.remove(alpha_nucleons[n]);
    }
    this.restart();
    this.eject(alpha_particle);
    return this;
}

// Todo: split into beta- and beta+ modes
Nucleus.prototype.betaDecay = function(type){
    if (typeof type == "undefined"){ var type = '-'; }
    if (type != '-' && type != '+'){ type = '-'; }
    // Identify a proton to split
    var proton = null; var p = 0;
    while (proton == null && p < this.particlesArray().length){
        if (this.particlesArray()[p].type == 'proton'){ proton = this.particlesArray()[p]; }
        p++;
    }
    if (proton == null){
        console.log("Unable to beta decay nucleus; no protons found!");
        return;
    }

    // Pop the proton out of existence and pop into existence a neutron and electron at the same spot
    this.force.stop();
    this.add(new Neutron().attr("x", proton.px).attr("y", proton.py));
    this.remove(proton);
    this.restart();
    var electron = new Electron().attr("x", proton.px).attr("y", proton.py).appendTo(this.ejecta_selector);
    this.eject(electron);
    return this;
};

Nucleus.prototype.eject = function(particle){
    var angle = Math.random() * 360;
    var x_final = Math.cos(angle) * Math.sqrt(this.width_sum) * 6;
    var y_final = Math.sin(angle) * Math.sqrt(this.width_sum) * 6;
    d3.select("#" + particle.id).transition().duration(3000).ease("cubic-out")
        .attr("transform","translate(" + x_final + "," + y_final + ")").style("opacity", 0).remove();
}

/*
var n = new Nucleus(matter.elements[6].nuclides[8]).setId("foo").appendTo(d3.select("#specifics"));
d3.select("#foo").attr("transform","translate(300,300) scale(15)");
*/