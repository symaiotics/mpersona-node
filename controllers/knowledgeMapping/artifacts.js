//Inherits KnowledgeSet permission and requires a knowledgeSetUuid for each transaction

const KnowledgeSet = require('../../models/knowledgeMapping/KnowledgeSet');
const Artifact = require('../../models/knowledgeMapping/Artifact');
const ApiError = require('../../error/ApiError');
const logger = require('../../middleware/logger');
const uuidv4 = require('uuid').v4;

exports.getArtifacts = async function (req, res, next) {
    try {
        const viewAll = req.body.viewAll || req.query.viewAll || false;
        const username = req?.tokenDecoded?.username || null;
        const roles = req?.tokenDecoded?.roles || [];
        const knowledgeSetUuid = req.body.knowledgeSetUuid || req.query.knowledgeSetUuid;

        let baseQuery = { status: 'active' };

        if (knowledgeSetUuid) {
            const knowledgeSet = await KnowledgeSet.findOne({ uuid: knowledgeSetUuid });
            if (!knowledgeSet) {
                return next(ApiError.notFound("KnowledgeSet not found."));
            }
            const artifactUuids = knowledgeSet.artifactUuids || [];
            baseQuery = { ...baseQuery, uuid: { $in: artifactUuids } };
        } else {
            if (roles.includes('admin') && viewAll) {
                baseQuery = baseQuery;
            } else if (username) {
                baseQuery = {
                    ...baseQuery,
                    $or: [
                        { owners: username },
                        { editors: username },
                        { viewers: username },
                        { publishStatus: 'published' }
                    ]
                };
            } else {
                baseQuery = {
                    ...baseQuery,
                    publishStatus: 'published'
                };
            }
        }

        const aggregation = [
            { $match: baseQuery },
            {
                $addFields: {
                    isOwner: username ? { $in: [username, { $ifNull: ["$owners", []] }] } : false,
                    isEditor: username ? { $in: [username, { $ifNull: ["$editors", []] }] } : false,
                    isViewer: username ? { $in: [username, { $ifNull: ["$viewers", []] }] } : false,
                    isAdmin: { $literal: roles.includes('admin') }
                }
            }
        ];

        if (!roles.includes('admin')) {
            aggregation.push({
                $project: {
                    owners: 0,
                    editors: 0,
                    viewers: 0
                }
            });
        }

        const artifacts = await Artifact.aggregate(aggregation).sort({ 'momentUpdated': -1 });
        res.status(200).json({ message: "Here are all the active Artifacts", payload: artifacts });
    } catch (error) {
        next(ApiError.internal("An error occurred while retrieving Artifacts"));
    }
};

exports.createArtifacts = async function (req, res, next) {
    try {
        var artifactsData = req.body.artifacts || req.query.artifacts || [];
        var knowledgeSetUuid = req.body.knowledgeSetUuid || req.query.knowledgeSetUuid; ///this is optional

        console.log("DD", artifactsData)
        console.log("KnowledgeSetUuid", knowledgeSetUuid)
        if (!Array.isArray(artifactsData)) {
            artifactsData = [artifactsData];
        }

        // Set the person who created these Artifacts, if applicable
        artifactsData.forEach((artifact) => {
            if (req.tokenDecoded) {
                artifact.owners = [req.tokenDecoded.username];
                artifact.editors = [req.tokenDecoded.username];
                artifact.viewers = [req.tokenDecoded.username];
                artifact.createdBy = req.tokenDecoded.username;
            }
            //Assign a uuid if not assigned by the UI
            if (!artifact.uuid) artifact.uuid = uuidv4()
        });

        // Attempt to insert the new Artifacts
        var results = await Artifact.insertMany(artifactsData, { runValidators: true });

        var artifactUuids = results.map(artifact => artifact.uuid);


        if (knowledgeSetUuid) {
            // Attempt to update the knowledgeSet with the new Artifact UUIDs, ensuring uniqueness
            var knowledgeSetUpdateResult = await KnowledgeSet.updateOne(
                { uuid: knowledgeSetUuid },
                { $addToSet: { artifactUuids: { $each: artifactUuids } } }
            );

            // Log the update result for debugging
            console.log('KnowledgeSet update result:', knowledgeSetUpdateResult);

            // Check if the knowledgeSet artifact was found
            if (!knowledgeSetUpdateResult.matchedCount) {
                throw ApiError.internal("KnowledgeSet not found.");
            }

            // If the knowledgeSet update was not successful, remove the inserted Artifacts
            if (!knowledgeSetUpdateResult.modifiedCount) {
                await Artifact.deleteMany({ uuid: { $in: artifactUuids } });
                throw ApiError.internal("Failed to update the knowledgeSet with Artifact UUIDs.");
            }
        }

        res.status(201).json({ message: "Created all the provided Artifacts", payload: results });
    } catch (error) {
        console.log(error)
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while creating Artifacts"));
    }
};


exports.updateArtifacts = async function (req, res, next) {
    try {
        var artifactUpdates = req.body.artifacts || [];
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        if (!Array.isArray(artifactUpdates)) {
            throw ApiError.badRequest("Artifacts updates should be an array.");
        }

        // Process each Artifact update
        for (const update of artifactUpdates) {
            let artifact = await Artifact.findOne({ uuid: update.uuid });

            if (!artifact) {
                throw ApiError.notFound(`Artifact with UUID ${update.uuid} not found.`);
            }

            const isEditor = artifact.editors.includes(username);
            const isAdmin = roles.includes('admin');

            // if (!isEditor && !isAdmin) {
            //     throw ApiError.forbidden("You do not have permission to update this Artifact.");
            // }

            // const updateOps = {};
            // for (const [key, value] of Object.entries(update)) {
            //     if (Array.isArray(value)) {
            //         updateOps['$addToSet'] = { [key]: { $each: value } };
            //     } else {
            //         updateOps['$set'] = { [key]: value };
            //     }
            // }

            await Artifact.updateOne({ uuid: update.uuid }, update);
        }

        res.status(200).json({ message: "Artifacts updated successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while updating Artifacts"));
    }
};

exports.addRemoveTags = async function (req, res, next) {
    try {
        var operation = req.body.operation || 'add';
        var tagsToAdd = req.body.tags || [];
        var artifactUpdates = req.body.artifacts || [];

        if (!Array.isArray(artifactUpdates)) {
            throw ApiError.badRequest("Artifacts updates should be an array.");
        }

        // Process each Artifact update
        for (const update of artifactUpdates) {
            let artifact = await Artifact.findOne({ uuid: update.uuid });

            if (!artifact) {
                throw ApiError.notFound(`Artifact with UUID ${update.uuid} not found.`);
            }

            let tagUuids = tagsToAdd.map((tag) => tag.uuid);
            let updateQuery = {};

            if (operation === 'add') {
                updateQuery = { $addToSet: { tagUuids: { $each: tagUuids } } };
            } else {
                updateQuery = { $pull: { tagUuids: { $in: tagUuids } } };
            }

            await Artifact.updateOne({ uuid: update.uuid }, updateQuery);
        }

        res.status(200).json({ message: "Artifacts updated successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while updating Artifacts"));
    }
};


exports.deleteArtifacts = async function (req, res, next) {
    try {
        var artifactUuids = req.body.artifactUuids || [];
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        if (!Array.isArray(artifactUuids)) {
            throw ApiError.badRequest("Artifact UUIDs should be an array.");
        }

        // Process each Artifact UUID for deletion
        for (const uuid of artifactUuids) {
            let artifact = await Artifact.findOne({ uuid: uuid });

            if (!artifact) {
                // If the Artifact does not exist, skip to the next one
                continue;
            }

            // const isEditor = artifact.editors.includes(username);
            // const isAdmin = roles.includes('admin');

            // if (!isEditor && !isAdmin) {
            //     throw ApiError.forbidden("You do not have permission to delete this Artifact.");
            // }

            // Delete the Artifact
            // await Artifact.deleteOne({ uuid: uuid });
            await Artifact.updateOne({uuid:uuid}, {$set:{status:'inactive'}})

            // Remove the uuid from the knowledgeSet's artifactUuids
            await KnowledgeSet.updateMany(
                { artifactUuids: uuid },
                { $pull: { artifactUuids: uuid } }
            );
        }

        res.status(200).json({ message: "Artifacts deleted successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while deleting Artifacts"));
    }
};

exports.manageRoles = async function (req, res, next) {
    try {
        var { artifactUuid, editorsToAdd, editorsToRemove, viewersToAdd, viewersToRemove } = req.body;
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        let artifact = await Artifact.findOne({ uuid: artifactUuid });

        if (!artifact) {
            throw ApiError.notFound("Artifact not found.");
        }

        const isEditor = artifact.editors.includes(username);
        const isAdmin = roles.includes('admin');

        if (!isEditor && !isAdmin) {
            throw ApiError.forbidden("You do not have permission to manage roles for this Artifact.");
        }

        const updateOps = {};
        if (editorsToAdd && editorsToAdd.length) {
            updateOps['$addToSet'] = { editors: { $each: editorsToAdd } };
        }
        if (editorsToRemove && editorsToRemove.length) {
            updateOps['$pullAll'] = { editors: editorsToRemove };
        }
        if (viewersToAdd && viewersToAdd.length) {
            updateOps['$addToSet'] = { ...updateOps['$addToSet'], viewers: { $each: viewersToAdd } };
        }
        if (viewersToRemove && viewersToRemove.length) {
            updateOps['$pullAll'] = { ...updateOps['$pullAll'], viewers: viewersToRemove };
        }

        await Artifact.updateOne({ uuid: artifactUuid }, updateOps);

        res.status(200).json({ message: "Roles updated successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while managing roles"));
    }
};