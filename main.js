apiKey = 'wLT26LF3VUbLz6TXR8CjMEZxBto0v6KEfVvhOs09';
URL = {
    search: 'http://api.nal.usda.gov/ndb/search'
    , list: 'http://api.nal.usda.gov/ndb/list'
    , nutrients: 'http://api.nal.usda.gov/ndb/nutrients'
    , report: 'http://api.nal.usda.gov/ndb/reports'
};
var theScope = {};
var theLimit = 3;
var aMode = [
    { factor : -1, word : 'least' },
    { factor : 1, word : 'most' }
];

// utility function to shuffle arrays
function shuffle(array) {
    var i = 0
        , j = 0
        , temp = null

    for (i = array.length - 1; i > 0; i -= 1) {
        j = Math.floor(Math.random() * (i + 1))
        temp = array[i]
        array[i] = array[j]
        array[j] = temp
    }
}

// utility function to check for nonzero values within an object
function nonzero(obj, keyname)
{
    var result = true;
    for (var key in obj)
    {
        if (obj[key][keyname] == 0)
            result = false;
    }
    return result;
}

angular.module('myApp', ['mobile-angular-ui', 'ngAnimate']).controller("myCtrl", ['$q', '$scope', '$http', function ($q, $scope, $http, $timeout) {
    theScope = $scope;

    $scope.nutrients = {
        255: "water"
        , 208: "calories"
        , 203: "protein"
        , 204: "fat"
        , 205: "carbohydrates"
        , 291: "fiber"
        , 269: "sugar"
        , 307: "sodium"
        , 601: "cholesterol"
    };
    $scope.rights = 0;
    $scope.wrongs = 0;
    $scope.desired = function(aNutrients){
        return aNutrients.filter(function(nutrient){
            return $scope.nutrients[nutrient.nutrient_id];
        });
    };
    $scope.classes = {
        positive : "list-group-item-success",
        negative : "list-group-item-danger"
    };
    $scope.spinclass = function(){
        return ($scope.loading ? "fa-spin" : "");
    };
    //            $http({
    //                method : 'GET',
    //                url : URL.list,
    //                params : {
    //                    api_key : apiKey,
    //                    format : 'json',
    //                    lt : 'g'
    //                }
    //            }).then(function(response){
    //                $scope.groups = response.data.list;
    //            });

    var getFood = function () {
        // Create a deferred object for this set of requests
        var defer = $q.defer();
        // Add promise to the requests array immediately so our $q.all sees it
        $scope.requests.push(defer.promise);
        var foodOffset = Math.floor(Math.random() * ($scope.whole.total));
        var req = $http({
            method: 'GET'
            , url: URL.search
            , params: {
                api_key: apiKey
                , format: 'json'
                , max: 1
                , offset: foodOffset
            }
        });
        req.then(function (response) {
            $scope.foods.push(response.data.list.item[0]);
            var reqReport = $http({
                method: 'GET'
                , url: URL.report
                , params: {
                    api_key: apiKey
                    , format: 'json'
                    , type: 'b'
                    , ndbno: response.data.list.item[0].ndbno
                }
            });
            reqReport.then(function (response) {
                $scope.reports[response.data.report.food.ndbno] = response.data.report.food;
                defer.resolve();
            });
        });
    };

    $http({
        method: 'GET'
        , url: URL.search
        , params: {
            api_key: apiKey
            , format: 'json'
            , max: 1
            , offset: 0
        }
    }).then(function (response) {
        $scope.whole = response.data.list;
        $scope.init();
    });
    $scope.choose = function(option){
        if ($scope.guessed)
            return false;
        $scope.guessed = true;
        option.guessed = true;
        if ($scope.byNutrient[$scope.theNutrient][option.ndbno].value == $scope.correct)
            $scope.rights++;
        else
            $scope.wrongs++;
        for (var key in $scope.foods) {
            (function(){
                var food = $scope.foods[key];
                var value = $scope.byNutrient[$scope.theNutrient][food.ndbno].value;
                if (value == $scope.correct)
                    food.positive = true;
                else if (food.guessed)
                    food.negative = true;
            })();
        }
    };
    $scope.init = function(){
        $scope.foods = [];
        $scope.reports = {};
        $scope.requests = [];
        $scope.byNutrient = {};
        $scope.theNutrient = null;
        $scope.guessed = false;
        $scope.loading = true;

        $scope.mode = aMode[Math.floor(2*Math.random())];

        for (i = 1; i <= theLimit; i++) {
            getFood();
        }
        // run after all data is received
        $q.all($scope.requests).then(function (values) {
            var oTemp = {};
            // reorganize the data by nutrient
            for (var key in $scope.reports) {
                var report = $scope.reports[key];
                var nuts = $scope.desired(report.nutrients);
                for (var key in nuts) {
                    var nutrient = nuts[key];
                    oTemp[nutrient.nutrient_id] = oTemp[nutrient.nutrient_id] || {};
                    oTemp[nutrient.nutrient_id][report.ndbno] = nutrient;
                }
            }
            // filter down to only nutrients that are in all results
            for (var key in oTemp) {
                if (Object.keys(oTemp[key]).length == theLimit && nonzero(oTemp[key], 'value'))
                {
                    $scope.byNutrient[key] = oTemp[key];
                }
            }
            var nKeys = Object.keys($scope.byNutrient);
            // pick a random nutrient!
            $scope.theNutrient = nKeys[Math.floor(Math.random() * nKeys.length)];
            var aValues = $scope.foods.map(function(food){
                return $scope.byNutrient[$scope.theNutrient][food.ndbno].value;
            });
            if ($scope.mode.factor == 1)
                $scope.correct = Math.max.apply(null, aValues);
            else
                $scope.correct = Math.min.apply(null, aValues);
            $scope.loading = false;
        });
    };
}]);
