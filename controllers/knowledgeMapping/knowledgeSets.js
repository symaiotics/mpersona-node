

const KnowledgeSet = require('../../models/knowledgeMapping/KnowledgeSet');
const Roster = require('../../models/Roster');

exports.getKnowledgeSets = async function (req, res, next) {
    try {
        var viewAll = req.body.viewAll || req.query.viewAll || false;
        var username = req?.tokenDecoded?.username || null;
        var roles = req?.tokenDecoded?.roles || [];

        const baseQuery = { status: 'active' };
        var query;

        if (roles.includes('admin') && viewAll) {
            query = baseQuery;
        } else if (username) {
            query = {
                ...baseQuery,
                $or: [
                    { editors: username },
                    { viewers: username },
                    { publishStatus: 'published' }
                ]
            };
        } else {
            query = {
                ...baseQuery,
                publishStatus: 'published'
            };
        }

        var aggregation = [
            { $match: query },
            {
                $addFields: {
                    isEditor: username !== null ? { $in: [username, { $ifNull: ["$editors", []] }] } : false,
                    isViewer: username !== null ? { $in: [username, { $ifNull: ["$viewers", []] }] } : false,
                    isAdmin: { $literal: roles.includes('admin') }
                }
            }
        ];

        if (!roles.includes('admin')) {
            aggregation.push({
                $project: {
                    editors: 0,
                    viewers: 0,
                    owners: 0,
                }
            });
        }

        var knowledgeSets = await KnowledgeSet.aggregate(aggregation).sort('name');
        res.status(200).json({ message: "Here are all the active knowledge sets", payload: knowledgeSets });

    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error });
    }
};


exports.createKnowledgeSets = async function (req, res, next) {
    try {
        var knowledgeSetsData = req.body.knowledgeSets || req.query.knowledgeSets || [];
        var rosterUuid = req.body.rosterUuid || req.query.rosterUuid;

        if (!rosterUuid) {
            return res.status(400).json({ message: "Roster UUID must be provided." });
        }

        if (!Array.isArray(knowledgeSetsData)) {
            knowledgeSetsData = [knowledgeSetsData];
        }

        // Set the person who created these knowledge sets, if applicable
        knowledgeSetsData.forEach((knowledgeSet) => {
            if (req.tokenDecoded) {
                knowledgeSet.owners = [req.tokenDecoded.username];
                knowledgeSet.editors = [req.tokenDecoded.username];
                knowledgeSet.viewers = [req.tokenDecoded.username];
                knowledgeSet.createdBy = req.tokenDecoded.username;
            }
        });

        // Attempt to insert the new knowledge sets
        var results = await KnowledgeSet.insertMany(knowledgeSetsData);
        var knowledgeSetUuids = results.map(knowledgeSet => knowledgeSet.uuid);

        // Attempt to update the roster with the new knowledge set UUIDs, ensuring uniqueness
        var rosterUpdateResult = await Roster.updateOne(
            { uuid: rosterUuid },
            { $addToSet: { knowledgeSetUuids: { $each: knowledgeSetUuids } } }
        );

        // If the roster update was not successful, remove the inserted knowledge sets
        if (!rosterUpdateResult.nModified) {
            await KnowledgeSet.deleteMany({ uuid: { $in: knowledgeSetUuids } });
            throw new Error("Failed to update the roster with knowledge set UUIDs.");
        }

        res.status(201).json({ message: "Created all the provided knowledge sets", payload: results });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
};

exports.updateKnowledgeSets = async function (req, res, next) {
    try {
        var knowledgeSetsUpdates = req.body.knowledgeSets || [];
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        if (!Array.isArray(knowledgeSetsUpdates)) {
            return res.status(400).json({ message: "Knowledge sets updates should be an array." });
        }

        // Process each knowledge set update
        for (const update of knowledgeSetsUpdates) {
            // Fetch the current knowledge set to check permissions
            let knowledgeSet = await KnowledgeSet.findOne({ uuid: update.uuid });

            if (!knowledgeSet) {
                return res.status(404).json({ message: `Knowledge set with UUID ${update.uuid} not found.` });
            }

            // Check if the user is an editor or an admin
            const isEditor = knowledgeSet.editors.includes(username);
            const isAdmin = roles.includes('admin');

            if (!isEditor && !isAdmin) {
                return res.status(403).json({ message: "You do not have permission to update this knowledge set." });
            }

            // Prepare the update operations
            const updateOps = {};
            for (const [key, value] of Object.entries(update)) {
                if (Array.isArray(value)) {
                    // Use $addToSet for adding unique elements to arrays
                    updateOps['$addToSet'] = { [key]: { $each: value } };
                } else {
                    // Use $set for updating non-array fields
                    updateOps['$set'] = { [key]: value };
                }
            }

            // Perform the update operation
            await KnowledgeSet.updateOne({ uuid: update.uuid }, updateOps);
        }

        res.status(200).json({ message: "Knowledge sets updated successfully." });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
};

exports.deleteKnowledgeSets = async function (req, res, next) {
    try {
        var knowledgeSetUuids = req.body.knowledgeSetUuids || [];
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        if (!Array.isArray(knowledgeSetUuids)) {
            return res.status(400).json({ message: "Knowledge set UUIDs should be an array." });
        }

        // Process each knowledge set UUID for deletion
        for (const uuid of knowledgeSetUuids) {
            // Fetch the current knowledge set to check permissions
            let knowledgeSet = await KnowledgeSet.findOne({ uuid: uuid });

            if (!knowledgeSet) {
                // If the knowledge set does not exist, skip to the next one
                continue;
            }

            // Check if the user is an editor or an admin
            const isEditor = knowledgeSet.editors.includes(username);
            const isAdmin = roles.includes('admin');

            if (!isEditor && !isAdmin) {
                return res.status(403).json({ message: "You do not have permission to delete this knowledge set." });
            }

            // Perform the delete operation
            await KnowledgeSet.deleteOne({ uuid: uuid });
        }

        res.status(200).json({ message: "Knowledge sets deleted successfully." });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
};

exports.manageRoles = async function (req, res, next) {
    try {
        var { uuid, editorsToAdd, editorsToRemove, viewersToAdd, viewersToRemove } = req.body;
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        // Fetch the current knowledge set to check permissions
        let knowledgeSet = await KnowledgeSet.findOne({ uuid: uuid });

        if (!knowledgeSet) {
            return res.status(404).json({ message: "Knowledge set not found." });
        }

        // Check if the user is an editor or an admin
        const isEditor = knowledgeSet.editors.includes(username);
        const isAdmin = roles.includes('admin');

        if (!isEditor && !isAdmin) {
            return res.status(403).json({ message: "You do not have permission to manage roles for this knowledge set." });
        }

        // Prepare the update operations
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

        // Perform the update operation
        await KnowledgeSet.updateOne({ uuid: uuid }, updateOps);

        res.status(200).json({ message: "Roles updated successfully." });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
};