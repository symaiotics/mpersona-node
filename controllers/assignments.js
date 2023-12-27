

const Assignment = require('../models/Assignment');
const Roster = require('../models/Roster');
const ApiError = require('../error/ApiError');
const uuidv4 = require('uuid').v4;


exports.getAssignments = async function (req, res, next) {
    try {
        const wrappUuid = req.body.wrappUuid || req.query.wrappUuid;

        const assignments = await Assignment.find({ wrappUuid: wrappUuid }).sort('momentUpdated');
        res.status(200).json({ message: "Here are all the associated assignments", payload: assignments });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while creating assignments"));
    }

};


exports.createAssignments = async function (req, res, next) {
    try {
        var assignmentsData = req.body.assignments || req.query.assignments || [];
        var rosterUuid = req.body.rosterUuid || req.query.rosterUuid;
        var wrappUuid = req.body.wrappUuid || req.query.wrappUuid;
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        if (!Array.isArray(assignmentsData)) {
            assignmentsData = [assignmentsData];
        }

        // Check if the user is an admin or has editor rights in the roster
        const isAdmin = roles.includes('admin');
        const roster = await Roster.findOne({ uuid: rosterUuid });
        const isEditor = roster && roster.editors.includes(username);

        if (!isAdmin && !isEditor) {
            throw ApiError.forbidden("You do not have editor rights in the roster.");
        }

        //For now, just do a cleanup. Longer term, can think about how to only remove deltas
        //Delete all assignments where wrappUuid and rosterUuid match
        await Assignment.deleteMany({ wrappUuid: wrappUuid, rosterUuid: rosterUuid })
        //Remove the assignmentUuids from the Roster
        if (roster) {
            await Roster.updateOne(
                { uuid: roster.uuid },
                { assignmentUuids: [] }
            );
        }

        // Initialize an array to store the generated UUIDs for the assignments
        let assignmentUuids = [];

        // Set the person who created these assignments, if applicable
        assignmentsData = assignmentsData.map((assignment) => {
            const assignmentUuid = uuidv4();
            assignmentUuids.push(assignmentUuid);

            return {
                ...assignment,
                owners: [username],
                editors: [username],
                viewers: [username],
                createdBy: username,
                uuid: assignmentUuid,
                wrappUuid: wrappUuid,
                rosterUuid: rosterUuid,
            };
        });


        // Attempt to insert the new assignments
        var results = await Assignment.insertMany(assignmentsData, { runValidators: true });

        // Update the Roster with the new assignment UUIDs
        if (roster) {
            await Roster.updateOne(
                { uuid: rosterUuid },
                { $addToSet: { assignmentUuids: { $each: assignmentUuids } } }
            );
        }

        res.status(201).json({ message: "Created all the provided assignments", payload: results });
    } catch (error) {
        console.log(error)
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while creating assignments"));
    }
};

exports.deleteAssignments = async function (req, res, next) {
    try {
        var assignmentUuids = req.body.assignmentUuids || [];
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        if (!Array.isArray(assignmentUuids)) {
            throw ApiError.badRequest("Assignment UUIDs should be an array.");
        }

        let errors = [];
        for (const uuid of assignmentUuids) {
            let assignment = await Assignment.findOne({ uuid: uuid });
            if (!assignment) {
                errors.push(`Assignment with UUID: ${uuid} does not exist.`);
                continue;
            }

            // Check if the user is an admin or has editor rights in the roster
            const isAdmin = roles.includes('admin');
            const roster = await Roster.findOne({ assignmentUuids: uuid });
            const isEditor = roster && roster.editors.includes(username);

            if (!isAdmin && !isEditor) {
                errors.push(`You do not have permission to delete assignment with UUID: ${uuid}`);
                continue;
            }

            // Remove the assignment UUID from the Roster
            if (roster) {
                await Roster.updateOne(
                    { uuid: roster.uuid },
                    { $pull: { assignmentUuids: uuid } }
                );
            }

            // Delete the assignment
            await Assignment.deleteOne({ uuid: uuid });
        }

        if (errors.length > 0) {
            throw ApiError.forbidden(errors.join('\n'));
        }

        res.status(200).json({ message: "Assignments deleted successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while deleting assignments"));
    }
};