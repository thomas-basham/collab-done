import { useState, useEffect } from "react";
import { useAuth } from "../contexts/auth";
import useResource from "../hooks/useResource";
import { HiOutlineTrash } from "react-icons/hi";
import { Modal } from "react-bootstrap";

export default function CommentSection(props) {
  const { session, absoluteAvatar_urlAuth } = useAuth();
  const {
    createComment,
    comments,
    setComments,
    getComments,
    getProfileByID,
    deleteComment,
  } = useResource();

  const [comment, setComment] = useState("");
  const [viewCommentData, setViewCommentData] = useState(null);
  const [viewCommentPosition, setViewCommentPosition] = useState(null);
  const [viewCommentProfile, setViewCommentProfile] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  useEffect(() => {
    getComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFormSubmit = async (e) => {
    e.preventDefault();
    if (props.songDetails != null && comment != "") {
      const songDuration = props.songDetails.getDuration();
      const currentTime = props.songDetails.getCurrentTime();

      const commentPosition = (currentTime / songDuration) * 100;
      let values = {
        commentPosition: commentPosition,
        user: session.user.id,
        comment: comment,
        song_id: props.song_id,
        avatarURl: absoluteAvatar_urlAuth,
      };
      await createComment(values);

      let newComments = await getComments();
      setComment("");
      setComments(newComments);
    }
  };

  const displayComment = async (data) => {
    setViewCommentPosition(data.commentPosition);
    setViewCommentData(data);

    let profile = await getProfileByID(data.user);
    if (!profile["username"]) {
      profile["username"] = "Unknown User";
    }
    setViewCommentProfile(profile);
  };

  const handleDeleteComment = async (id) => {
    await deleteComment(id);
    setViewCommentData(null);
    setViewCommentProfile(null);
    setShowDeleteModal(false);
  };

  const DeleteButton = () => {
    if (session?.user && session?.user.id == viewCommentData?.user) {
      return (
        <HiOutlineTrash
          className="brand-hover"
          cursor={"pointer"}
          onClick={() => setShowDeleteModal(true)}
        />
      );
    }
  };

  let filteredComments = comments?.filter(
    (comment) => comment.song_id === props.song_id
  );
  return (
    <>
      <div className="row ">
        <div id="spacer" className="col-2"></div>
        <div className="col comment-holder">
          {filteredComments?.map((data, i) => {
            return (
              <div
                key={i}
                className="comment-icon"
                onMouseEnter={() => displayComment(data)}
                style={{
                  display: "inline",
                  cursor: "default",
                  position: "relative",
                  left:
                    data.commentPosition - 12 > 0
                      ? `${data.commentPosition}%`
                      : `${data.commentPosition}%`,
                }}
              >
                {data.avatarURl ? (
                  <img
                    src={data.avatarURl}
                    alt="Avatar"
                    className="avatar image d-inline-flex"
                    style={{ height: "15px", width: "15px" }}
                  />
                ) : (
                  <div
                    className="avatar no-image d-inline-flex"
                    style={{ height: "15px", width: "15px" }}
                  />
                )}
              </div>
            );
          })}
          <div
            className="d-inline comment"
            style={{
              position: "relative",
              cursor: "default",
              left:
                viewCommentPosition - 16 > 0
                  ? `${viewCommentPosition}%`
                  : `${viewCommentPosition}%`,
            }}
          >
            <div>
              <a
                href={`/pr/${viewCommentProfile?.id}`}
                className="brand-text"
                style={{ cursor: "pointer" }}
              >
                {" "}
                {viewCommentProfile ? viewCommentProfile.username : ""}
              </a>
            </div>
            {viewCommentData?.comment}
            &nbsp;
            <DeleteButton />
          </div>
        </div>
      </div>
      <div className="row">
        <div id="spacer" className="col-2"></div>
        <div className="col">
          {session?.user && (
            <form onSubmit={onFormSubmit}>
              <input
                type="text"
                autoComplete="off"
                placeholder="Write a comment"
                aria-invalid="false"
                aria-describedby=""
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              ></input>
              <button hidden type="submit">
                Submit
              </button>
            </form>
          )}
        </div>
      </div>

      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        size="lg"
        aria-labelledby="contained-modal-title-vcenter"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Are you sure you want to delete this comment?
          </Modal.Title>
        </Modal.Header>

        <button
          className="bg-danger delete-button"
          onClick={() => handleDeleteComment(viewCommentData.id)}
        >
          Delete Comment
        </button>

        <button onClick={() => setShowDeleteModal(false)}>Cancel</button>
      </Modal>
    </>
  );
}
