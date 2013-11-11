# Xui-Framework

A 'MVC' javascript framework

## Usage

Copy xui.js and its required framework: jquery and underscore to your app.
    
## Example usage

In general, the functionalities of Xui are quite similar to Backbone framework.

### Model
    movie = Xui.Model.extend({
        defaults: {
            id: 0,
            summary: "",
            title: "",
            updated_at: "",
            img_url: "",
            user: {}
        },

        url: function() {
            return 'http://cs3213.herokuapp.com/movies/{0}.json'.format(this.id);
        }
    });

    movie.fetch();
    console.log(movie.to_json());

### View
    movie_view = Xui.View.extend({
        template: JST["movie"],
        model: movie_model,
        render: function() {
            var renderedHtml = this.template(this.model.attributes);
            this.$el.html(renderedHtml);
            this.delegateEvents();
            return this;
        },
        events: {
            "click img#viewMovie": "viewMovieDetail"
        },
        viewMovieDetail: function() {
            mainRouter.navigate("movies/" + this.model.attributes.id, { trigger: true });
        }
    });

### Collection View

Pass in the subView as the view of each model for the collection view:

    moviesView = Xui.CollectionView.extend({
        template: JST["movies"],
        subView: Xuimovie.Views.Movie,
        events: {
            "click a#new-movie-btn": "toNewMoviePage"
        },

        _navigateToPage: function(page) {
            this.undelegateEvents();
            mainRouter.navigate("/" + page, {
                trigger: true
            });
            this.destroy();
        },

        toNewMoviePage: function(e) {
            e.preventDefault();
            this._navigateToPage('new_movie');
        }
    });

### Router
    router = Xui.Router.extend({
        routes: {
            ""                  : "mainPage",
            "#loggedout"        : "redirectToMain",
            "movies/:id"        : "getMovie",
            "movies/:id/#edit"  : "editMovie",
            "new_movie"         : "createMovie",
            ":moviePage"        : "mainPage"
        }
    });