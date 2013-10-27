# Xui-Framework

A 'MVC' javascript framework

## Usage

Copy xui.js and its required framework: jquery and underscore to your app.
    
## Example usage

In general, the functionalities of Xui are quite similar to Backbone framework

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
