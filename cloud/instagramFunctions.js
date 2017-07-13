var _ = require('underscore');


Parse.Cloud.define("getInstagramFeeds", function (request, response) {

	var instagramId = request.params.instagramId;
	var limit = request.params.limit;

	Parse.Cloud.useMasterKey();
	var userQuery = new Parse.Query(Parse.User);
	userQuery.equalTo("instagramId", instagramId);
	userQuery.first
		({
			success: function (user) {
				var instagramAccessToken = user.get('instagramAccessToken')
				var path = 'https://api.instagram.com/v1/users/' + instagramId + '/media/recent?count=200&access_token=' + instagramAccessToken;
				console.log("instagramFeed path ", path);
				Parse.Cloud.httpRequest({
					url: path
				}).then(function (httpResponse) {

					if (httpResponse.data != undefined) {
						var feeds = httpResponse.data.data;
						var myFeeds = new Array();
						for (var i = 0; i < feeds.length; i++) {
							if (feeds[i].type == "image") {
								myFeeds.push(feeds[i]);
							}
						}
						return Parse.Promise.as().then(function () {
							var promise = Parse.Promise.as();
							
							_.each(myFeeds, function (feed) {
								
								promise = promise.then(function () {
									var promise = new Parse.Promise();

								}).then(function () {
									return updateInstagramFeed(user, feed);

								}).then(function () {
									return Parse.Promise.as();
								});
							});
							return promise;
						}).then(function () {
							response.success(1);
						}, function (error) {
							response.error("script failed with error.code: " + error.code + " error.message: " + error.message);
						});



					} else {
						response.error("error");
					}
				});
			}
		});
})


function updateInstagramFeed(user, instagramFeed, callback) {

	var promise = new Parse.Promise();
	console.log("instagramFeed id ", instagramFeed.id);
	var query = new Parse.Query("Feed");
	query.equalTo('feedId', instagramFeed.id);
	query.find({
		success: function (results_feeds) {
			var feed;
			if (results_feeds.length > 0) {
				feed = results_feeds[0];
			} else {
				var Feed = Parse.Object.extend("Feed");
				feed = new Feed();
			}
			console.log("feed ", feed);
			if (feed != null) {
				feed.set("socialType", 2);
				feed.set("likes", instagramFeed.likes.count);
				feed.set("createdTime", new Date(parseInt(instagramFeed.created_time) * 1000));
				feed.set("feedId", instagramFeed.id);
				feed.set("pictureUrl", instagramFeed.images.standard_resolution.url);
				feed.set("user", user);
				

				feed.save({
					success: function (feed) {
						promise.resolve(1);
					},
					error: function (error) {
						promise.resolve(0);
					}
				});
			} else {
				promise.resolve(0);
			}
		},
		error: function (error) {
			promise.resolve(0);
		}
	});

}
