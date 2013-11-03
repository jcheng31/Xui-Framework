var Controller = function(view, template) {
    this.view = $(view);
    this.template = $(template).html();
};

Controller.prototype.update = function(updatedModel) {
    var rendered = _.template(this.template, {movies: updatedModel.data});

    this.view.html(rendered);
};