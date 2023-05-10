module.exports = {
    deleteObject: function (client, deleteParams) {
        client.deleteObject(deleteParams, function (err, data) {
            if (err) {
                console.log("delete err " + deleteParams.Key);
            } else {
                console.log("deleted " + deleteParams.Key);
            }
        });
    },
    listBuckets: function (client) {
        client.listBuckets({}, function (err, data) {
            let buckets = data.Buckets;
            let owners = data.Owner;
            for (let i = 0; i < buckets.length; i += 1) {
                let bucket = buckets[i];
                console.log(bucket.Name + " created on " + bucket.CreationDate);
            }
            for (let i = 0; i < owners.length; i += 1) {
                console.log(owners[i].ID + " " + owners[i].DisplayName);
            }
        });

    },

    deleteBucket: function (client, bucket) {
        client.deleteBucket({ Bucket: bucket }, function (err, data) {
            if (err) {
                console.log("error deleting bucket " + err);
            } else {
                console.log("delete the bucket " + data);
            }
        })
    },

    clearBucket: function (client, bucket) {
        let self = this;
        client.listObjects({ Bucket: bucket }, async function (err, data) {
            if (err) {
                console.log("error listing bucket objects " + err);
                return;
            }
            let items = data.Contents;
            for (let i = 0; i < items.length; i += 1) {
                let deleteParams = { Bucket: bucket, Key: items[i].Key };
                self.deleteObject(client, deleteParams);
            }
        });
    }
};