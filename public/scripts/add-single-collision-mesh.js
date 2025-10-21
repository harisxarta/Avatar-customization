var AddSingleCollisionMesh = pc.createScript('addSingleCollisionMesh');
AddSingleCollisionMesh.attributes.add('modelContainerAsset', {type: 'asset', assetType: 'container'});


// initialize code called once per entity
AddSingleCollisionMesh.prototype.initialize = function() {
    // Ensure that the template root is set to scale 1 and the child below is 
    // set to the scale that the template root was at otherwise 
    // the collision scaling will incorrectly set the size
    if (this.entity.collision && this.entity.collision.type === 'mesh') {
        this.entity.collision.asset = this.modelContainerAsset.resource.model;
    }    
};
