const express = require("express");
const router = express.Router();
const fs = require("fs");
const db = require("../models/index");
const { sequelize } = require("../models/index");

const NIPPLE_QUANTITY_PER_PAGE = 5;

router.get("/", (req, res, next) => {
    res.redirect("/users/mypage/");
});

function imagesPageResponder(
    req,
    res,
    countQuery,
    imagesQuery,
    pageDifference
) {
    if (!module.exports.isLoggined(req)) {
        res.redirect("/users/login");
        return;
    }

    const page = req.params.page * 1;
    if (isNaN(page) || page < 0) {
        res.redirect("/users/mypage/0");
        return;
    }

    let nippleCount = 0;
    sequelize
        .query(countQuery, {
            replacements: {
                userID: req.session.login.id,
            },
        })
        .then((count) => {
            nippleCount = count[0][0].count;
            if (nippleCount < page * NIPPLE_QUANTITY_PER_PAGE) {
                const lastPage = Math.max(
                    Math.floor((nippleCount - 1) / NIPPLE_QUANTITY_PER_PAGE),
                    0
                );
                res.redirect("/users/mypage/" + lastPage);
                return;
            }
        })
        .catch((err) => {
            console.log(err);
        });

    sequelize
        .query(imagesQuery, {
            replacements: {
                userID: req.session.login.id,
                offset: page * NIPPLE_QUANTITY_PER_PAGE,
                limit: NIPPLE_QUANTITY_PER_PAGE,
            },
        })
        .then((images) => {
            const isNextPage =
                nippleCount > (page + 1) * NIPPLE_QUANTITY_PER_PAGE;
            const data = {
                images: images[0],
                login: req.session.login,
                page: page,
                isNextPage: isNextPage,
                pageDifference: pageDifference,
            };
            res.render("users/mypage", data);
        })
        .catch((err) => {
            console.log(err);
        });
}

async function getImageByReq(req) {
    const image = await db.Image.findOne({
        where: {
            id: req.body.imageID,
        },
    }).catch((err) => {
        console.log(err);
    });

    if (image === null) {
        return false;
    }
    if (image.userID != req.session.login.id) {
        return false;
    }

    return image;
}

router.get("/mypage", (req, res, next) => {
    res.redirect("/users/mypage/0");
});

router.get("/mypage/:page", (req, res, next) => {
    const countQuery =
        "SELECT COUNT(*) as count from IMAGES WHERE userID = :userID AND EXISTS (SELECT * FROM NIPPLES WHERE NIPPLES.imageID = IMAGES.id)";
    const imagesQuery =
        "SELECT id, path from IMAGES WHERE userID = :userID AND EXISTS (SELECT * FROM NIPPLES WHERE NIPPLES.imageID = IMAGES.id) ORDER BY createdAt LIMIT :limit OFFSET :offset";
    const pageDifference = {
        pageName: "マイページ",
        centerLink: "/users/nolocate/",
        centerLinkContext: "乳首座標未登録の画像一覧",
        locateButtonContext: "乳首座標再登録",
        locateButtonLink: "/users/mypage",
    };
    if (
        req.session.alertMessage !== null ||
        req.session.alertMessage !== undefined
    ) {
        pageDifference.alertMessage = req.session.alertMessage;
    }
    req.session.alertMessage = null;
    imagesPageResponder(req, res, countQuery, imagesQuery, pageDifference);
});

router.get("/nolocate", (req, res, next) => {
    res.redirect("/users/nolocate/0");
});

router.get("/nolocate/:page", (req, res, next) => {
    const countQuery =
        "SELECT COUNT(*) as count from IMAGES WHERE userID = :userID AND NOT EXISTS (SELECT * FROM NIPPLES WHERE NIPPLES.imageID = IMAGES.id)";
    const imagesQuery =
        "SELECT id, path from IMAGES WHERE userID = :userID AND NOT EXISTS (SELECT * FROM NIPPLES WHERE NIPPLES.imageID = IMAGES.id) ORDER BY createdAt LIMIT :limit OFFSET :offset";
    const pageDifference = {
        pageName: "乳首座標未登録の画像一覧",
        centerLink: "/users/mypage/",
        centerLinkContext: "マイページ",
        locateButtonLink: "/users/nolocate/",
        locateButtonContext: "乳首座標登録",
    };
    imagesPageResponder(req, res, countQuery, imagesQuery, pageDifference);
});

router.post("/mypage/", async (req, res, next) => {
    if (!module.exports.isLoggined(req)) {
        res.redirect("/users/login");
        return;
    }

    const image = await getImageByReq(req);
    if (!image) {
        res.redirect("/users/mypage/");
        return;
    }

    req.session.image = image;
    res.redirect("/nipple/location/update");
});

router.post("/mypage/delete", async (req, res, next) => {
    if (!module.exports.isLoggined(req)) {
        res.redirect("/users/login");
        return;
    }

    const image = await getImageByReq(req);
    if (!image) {
        res.redirect("/users/mypage/");
        return;
    }

    const path = "./public" + image.path;
    fs.unlink(path, (err) => {
        console.log(err);
    });

    await db.Nipple.destroy({
        where: {
            imageID: image.id,
        },
    }).catch((err) => {
        console.log(err);
        return;
    });

    await db.Image.destroy({
        where: {
            id: image.id,
        },
    }).catch((err) => {
        console.log(err);
        return;
    });

    req.session.alertMessage = "乳首削除完了！";
    res.redirect("/users/mypage/");
});

router.post("/nolocate/", async (req, res, next) => {
    if (!module.exports.isLoggined(req)) {
        res.redirect("/users/login");
        return;
    }

    const image = await getImageByReq(req);
    if (!image) {
        res.redirect("/users/mypage/");
        return;
    }

    req.session.image = image;
    res.redirect("/nipple/location/");
});

router.get("/login", (req, res, next) => {
    if (module.exports.isLoggined(req)) {
        res.redirect("/users/mypage");
        return;
    }
    const data = {
        content: "名前とパスワードを入力して下さい。",
    };
    res.render("users/login", data);
});

router.post("/login", (req, res, next) => {
    db.User.findOne({
        where: {
            name: req.body.name,
            pass: req.body.pass,
        },
    })
        .then((user) => {
            if (user != null) {
                req.session.login = user;
                res.redirect("/users/mypage");
            } else {
                const data = {
                    content:
                        "名前かパスワードに問題があります。再度入力して下さい。",
                };
                res.render("users/login", data);
            }
        })
        .catch((err) => {
            console.log(err);
        });
});

router.get("/create", (req, res, next) => {
    const data = {
        form: new db.User(),
        err: null,
    };
    res.render("users/create", data);
});

router.post("/create", (req, res, next) => {
    const form = {
        name: req.body.name,
        pass: req.body.pass,
    };
    db.sequelize.sync().then(() =>
        db.User.create(form)
            .then((usr) => {
                res.redirect("/users/mypage");
            })
            .catch((err) => {
                const data = {
                    form: form,
                    err: err,
                };
                res.render("users/create", data);
            })
    );
});

router.get("/delete", (req, res, next) => {
    if (!module.exports.isLoggined(req)) {
        res.redirect("/users/login");
        return;
    }

    res.render("users/delete");
});

router.post("/delete", async (req, res, next) => {
    if (!module.exports.isLoggined(req)) {
        res.redirect("/users/login");
        return;
    }

    const images = await db.Image.findAll({
        where: {
            userID: req.session.login.id,
        },
    }).catch((err) => {
        console.log(err);
    });

    images.forEach((image) => {
        const path = "./public" + image.path;
        fs.unlink(path, (err) => {
            console.log(err);
        });
    });

    sequelize
        .query(
            "DELETE FROM NIPPLES WHERE EXISTS (SELECT * FROM IMAGES WHERE IMAGES.id = NIPPLES.imageID AND IMAGES.userID = :userID)",
            {
                replacements: {
                    userID: req.session.login.id,
                },
            }
        )
        .catch((err) => {
            console.log(err);
        });

    db.Image.destroy({
        where: {
            userID: req.session.login.id,
        },
    }).catch((err) => {
        console.log(err);
    });

    db.User.findByPk(req.session.login.id).then((user) => {
        user.destroy().then(() => {
            req.session.login = null;
            res.redirect("/users/delete/complete");
        });
    });
});

router.get("/delete/complete", (req, res, next) => {
    res.render("users/delete-complete");
});

module.exports = router;

module.exports.isLoggined = (req) => {
    if (req.session.login == null) {
        return false;
    } else {
        return true;
    }
};
