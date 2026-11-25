|     |     | Speech-based |              |               | Information |                 | Retrieval |          | System |     |     |     |
| --- | --- | ------------ | ------------ | ------------- | ----------- | --------------- | --------- | -------- | ------ | --- | --- | --- |
|     |     |              | with         | Clarification |             | Dialogue        |           | Strategy |        |     |     |     |
|     |     |              | TeruhisaMisu |               |             | TatsuyaKawahara |           |          |        |     |     |     |
Schoolofinformatics
KyotoUniversity
Sakyo-ku,Kyoto,Japan
misu@ar.media.kyoto-u.ac.jp
|     |     | Abstract |     |     |     | general   |     | documents |        | (Fujii and | Itou, 2003)   | including    |
| --- | --- | -------- | --- | --- | --- | --------- | --- | --------- | ------ | ---------- | ------------- | ------------ |
|     |     |          |     |     |     | newspaper |     | articles  | (Chang |            | et al., 2002; | Hori et al., |
This paper addresses a dialogue strategy 2003). Insuchsystems,theautomaticspeechrecog-
nition(ASR)resultoftheuserutteranceismatched
| to clarify | and | constrain | the | queries | for |     |     |     |     |     |     |     |
| ---------- | --- | --------- | --- | ------- | --- | --- | --- | --- | --- | --- | --- | --- |
speech-drivendocumentretrievalsystems. against a set of target documents using the vector
In spoken dialogue interfaces, users often space model, and documents with high matching
make utterances before the query is com- scoresarepresentedtotheuser.
pletelygeneratedintheirmind;thusinput
|                                   |     |     |     |     |     |         | In this | kind | of document |            | retrieval   | systems, user |
| --------------------------------- | --- | --- | --- | --- | --- | ------- | ------- | ---- | ----------- | ---------- | ----------- | ------------- |
| queriesareoftenvagueorfragmental. |     |     |     |     | As  |         |         |      |             |            |             |               |
|                                   |     |     |     |     |     | queries |         | must | include     | sufficient | information | to iden-      |
a result, usually many items are matched. tify the desired documents. In conventional doc-
We propose an efficient dialogue frame- ument query tasks with typed-text input, such as
| work, where |     | the system | dynamically |     | se- |     |     |     |     |     |     |     |
| ----------- | --- | ---------- | ----------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
TRECQATrack(NISTandDARPA,2003),queries
lects an optimal question based on infor- are(supposedtobe)definiteandspecific. However,
mationgain(IG),whichrepresentsreduc- this is not the case when speech input is adopted.
| tion of | matched | items. | A set | of possible |     |     |        |           |     |       |               |          |
| ------- | ------- | ------ | ----- | ----------- | --- | --- | ------ | --------- | --- | ----- | ------------- | -------- |
|         |         |        |       |             |     | The | speech | interface |     | makes | input easier. | However, |
questionsispreparedusingvariousknowl-
thisalsomeansthatuserscanstartutterancesbefore
edge sources. As a bottom-up knowl- queriesarethoroughlyformedintheirmind. There-
edge source, we extract a list of words fore, input queries are often vague or fragmental,
| that can | take | a number | of objects |     | and po- |     |           |     |     |               |                   |     |
| -------- | ---- | -------- | ---------- | --- | ------- | --- | --------- | --- | --- | ------------- | ----------------- | --- |
|          |      |          |            |     |         | and | sentences |     | may | be ill-formed | or ungrammatical. |     |
tentiallycausesambiguity,usingadepen- Moreover,importantinformationmaybelostdueto
dency structure analysis of the document ASRerrors. Insuchcases,anenormouslistofpossi-
| texts. This | is  | complemented |     | by top-down |     |     |          |           |     |            |          |         |
| ----------- | --- | ------------ | --- | ----------- | --- | --- | -------- | --------- | --- | ---------- | -------- | ------- |
|             |     |              |     |             |     | ble | relevant | documents |     | is usually | obtained | because |
knowledgesourcesofmetadataandhand-
|     |     |     |     |     |     | there | is  | very | limited | information | that | can be used |
| --- | --- | --- | --- | --- | --- | ----- | --- | ---- | ------- | ----------- | ---- | ----------- |
craftedquestions. Anexperimentalevalu- as clues for retrieval. Therefore, it is necessary to
ationshowedthatthemethodsignificantly narrowdownthedocumentsbyclarifyingtheuser’s
improvedthesuccessrateofretrieval,and
intentionthroughadialogue.
| all categories |     | of the | prepared | questions |     |     |       |      |      |         |            |               |
| -------------- | --- | ------ | -------- | --------- | --- | --- | ----- | ---- | ---- | ------- | ---------- | ------------- |
|                |     |        |          |           |     |     | There | have | been | several | studies on | the follow-up |
contributedtotheimprovement.
|     |     |     |     |     |     | dialogue,   |           | and | most                      | of these | studies assume | that the   |
| --- | --- | --- | --- | --- | --- | ----------- | --------- | --- | ------------------------- | -------- | -------------- | ---------- |
|     |     |     |     |     |     | target      | knowledge |     | base                      | has      | a well-defined | structure. |
|     |     |     |     |     |     | Forexample, |           |     | Denecke(DeneckeandWaibel, |          |                | 1997)      |
1 Introduction
|     |     |     |     |     |     | addressed |     | a method |     | to generate | guiding | questions |
| --- | --- | --- | --- | --- | --- | --------- | --- | -------- | --- | ----------- | ------- | --------- |
The target of spoken dialogue systems is being ex- based on a tree structure constructed by unifying
tendedfromsimpledatabasessuchasflightinforma- pre-defined keywords and semantic slots. However,
tion (Levin et al., 2000; Potamianos et al., 2000) to theseapproachesarenotapplicabletogeneraldocu-
1003
ProceedingsofHumanLanguageTechnologyConferenceandConferenceonEmpiricalMethodsinNaturalLanguage
Processing(HLT/EMNLP),pages1003–1010,Vancouver,October2005.(cid:13)c2005AssociationforComputationalLinguistics

|     |     | System           |     |     |                 | User |         |     |                            |     |     |     |     |     |
| --- | --- | ---------------- | --- | --- | --------------- | ---- | ------- | --- | -------------------------- | --- | --- | --- | --- | --- |
|     |     |                  |     |     |                 |      | Table1: |     | Documentset(KnowledgeBase: |     |     |     |     | KB) |
|     |     | Automatic speech |     |     | Query utterance |      |         |     |                            |     |     |     |     |     |
textsize
|     |     | recognition (ASR) |     |     |     |     |     | Textcollection |     |     | #documents |     |     |     |
| --- | --- | ----------------- | --- | --- | --- | --- | --- | -------------- | --- | --- | ---------- | --- | --- | --- |
(byte)
|     |     |          |     |     |     |     |     |     | glossary |     |        | 4,707 | 1.4M |     |
| --- | --- | -------- | --- | --- | --- | --- | --- | --- | -------- | --- | ------ | ----- | ---- | --- |
|     |     | Matching |     |     |     |     |     |     | FAQ      |     | 11,306 |       | 12M  |     |
ConfirmationConfirmation
|           |     |     | with |            |     |     |     | DBofsupportarticles |     |     | 23,323 |     | 44M |     |
| --------- | --- | --- | ---- | ---------- | --- | --- | --- | ------------------- | --- | --- | ------ | --- | --- | --- |
| Knowledge |     |     |      | for robust |     |     |     |                     |     |     |        |     |     |     |
Knowledge
| base |     |           |     | retrieval  |     | Reply |                                      |     |     |     |     |     |          |     |
| ---- | --- | --------- | --- | ---------- | --- | ----- | ------------------------------------ | --- | --- | --- | --- | --- | -------- | --- |
| (KB) |     | base (KB) |     |            |     |       |                                      |     |     |     |     |     |          |     |
|      |     |           |     |            |     |       | danciesbydetectingandconfirmingthem. |     |     |     |     |     | Then,the |     |
Dialogue to
|     |     |     |     |     |     | Question | system | makes | questions |     | to clarify | the | user’s | query |
| --- | --- | --- | --- | --- | --- | -------- | ------ | ----- | --------- | --- | ---------- | --- | ------ | ----- |
narrow down
|     |     | retrieved |     |     |     |     | andnarrowdowntheretrieveddocuments. |     |     |     |     |     |     |     |
| --- | --- | --------- | --- | --- | --- | --- | ----------------------------------- | --- | --- | --- | --- | --- | --- | --- |
Reply
|     |     | documents |     |     |              |     | Thesystemflowoftheseprocessesissummarized |     |     |     |     |     |     |     |
| --- | --- | --------- | --- | --- | ------------ | --- | ----------------------------------------- | --- | --- | --- | --- | --- | --- | --- |
|     |     |           |     |     | Final result |     | belowandalsoshowninFigure1.               |     |     |     |     |     |     |     |
presented in this paper
1. Recognizetheuser’squeryutterance.
|     | Figure1: |     | Systemoverview |     |     |     |     |      |              |     |             |       |     |     |
| --- | -------- | --- | -------------- | --- | --- | --- | --- | ---- | ------------ | --- | ----------- | ----- | --- | --- |
|     |          |     |                |     |     |     | 2.  | Make | confirmation |     | for phrases | which | may | in- |
cludecriticalASRerrors.
mentsetswithoutsuchstructures.
| In this | paper, | we  | propose | a dialogue | strategy | to  |     |     |     |     |     |     |     |     |
| ------- | ------ | --- | ------- | ---------- | -------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
3. Retrievefromknowledgebase(KB).
| clarify           | the user’s | query | and       | constrain | the   | retrieval |     |              |     |           |     |          |     |        |
| ----------------- | ---------- | ----- | --------- | --------- | ----- | --------- | --- | ------------ | --- | --------- | --- | -------- | --- | ------ |
|                   |            |       |           |           |       |           | 4.  | Ask possible |     | questions | to  | the user | and | narrow |
| for a large-scale |            | text  | knowledge | base,     | which | does      |     |              |     |           |     |          |     |        |
not have a structure nor any semantic slots. In the downthematcheddocuments.
proposedscheme,thesystemdynamicallyselectsan
5. Outputtheretrievalresults.
| optimal | question, | which | can | reduce | the number | of  |     |     |     |     |     |     |     |     |
| ------- | --------- | ----- | --- | ------ | ---------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
matched items most efficiently. As a criterion of In this paper, we focus on the latter stage of the
| efficiency | of  | the questions, |     | information | gain | (IG) |     |     |     |     |     |     |     |     |
| ---------- | --- | -------------- | --- | ----------- | ---- | ---- | --- | --- | --- | --- | --- | --- | --- | --- |
proposedframework,andpresentaclarificationdia-
is defined. A set of possible questions is prepared loguestrategytonarrowdowndocuments.
| using bottom-up |     | and | top-down | knowledge |     | sources. |     |     |     |     |     |     |     |     |
| --------------- | --- | --- | -------- | --------- | --- | -------- | --- | --- | --- | --- | --- | --- | --- | --- |
As a bottom-up knowledge source, we conduct de- 2.2 Taskandback-endretrievalsystem
pendency structure analysis of the document texts, Our task involves text retrieval from a large-scale
and extract a list of words that can take a number knowledge base. For the target domain, we adopt a
| of objects, | thus | potentially | causing |     | ambiguity. | This |     |     |     |     |     |     |     |     |
| ----------- | ---- | ----------- | ------- | --- | ---------- | ---- | --- | --- | --- | --- | --- | --- | --- | --- |
softwaresupportknowledgebase(KB)providedby
| is combined |     | with top-down |     | knowledge | sources | of  |           |     |              |     |               |     |      |      |
| ----------- | --- | ------------- | --- | --------- | ------- | --- | --------- | --- | ------------ | --- | ------------- | --- | ---- | ---- |
|             |     |               |     |           |         |     | Microsoft |     | Corporation. |     | The knowledge |     | base | con- |
metadata and hand-crafted questions. The system sists of the following three kinds: glossary, fre-
then updates the query sentence using the user’s re- quentlyaskedquestions(FAQ),andsupportarticles.
plytothequestion,soastogenerateaconfirmation
|            |     |     |     |     |     |     | The   | specification |           | is listed | in Table  | 1,         | and there | are     |
| ---------- | --- | --- | --- | --- | --- | --- | ----- | ------------- | --------- | --------- | --------- | ---------- | --------- | ------- |
| totheuser. |     |     |     |     |     |     | about | 40K           | documents |           | in total. | An example |           | of sup- |
portarticleisshowninFigure2.
2 Documentretrievalsystemfor
|     |     |     |     |     |     |     | Dialog | Navigator |     | (Kiyota | et  | al., 2002) | has | been |
| --- | --- | --- | --- | --- | --- | --- | ------ | --------- | --- | ------- | --- | ---------- | --- | ---- |
large-scaleknowledgebase
|     |     |     |     |     |     |     | developed |     | at University |     | of Tokyo | as a | retrieval | sys- |
| --- | --- | --- | --- | --- | --- | --- | --------- | --- | ------------- | --- | -------- | ---- | --------- | ---- |
temforthisKB.Thesystemacceptsatyped-textin-
2.1 Systemoverview
|     |     |     |     |     |     |     | put | from users | and | outputs | a result | of  | the retrieval. |     |
| --- | --- | --- | --- | --- | --- | --- | --- | ---------- | --- | ------- | -------- | --- | -------------- | --- |
Wehavestudiedadialogueframeworktoovercome The system interprets an input sentence by taking
the problems in speech-based document retrieval syntactic dependency and synonymous expression
systems. In the framework, the system can han- into consideration for matching it with the KB. The
dlethreetypesofproblemscausedbyspeechinput: target of the matching is the summaries and detail
ASRerrors,redundancyinspokenlanguageexpres- information in the support articles, and the titles of
sion,andvaguenessofqueries. First,thesystemre- the Glossary and FAQ. The retrieved result is dis-
alizesrobustretrievalagainstASRerrorsandredun- playedtotheuserasthelistofdocumentslikeWeb
1004

| (cid:1) |     |     |     |     |     |     |     | (cid:2)                                   |     |     |            |     |               |     |
| ------- | --- | --- | --- | --- | --- | --- | --- | ----------------------------------------- | --- | --- | ---------- | --- | ------------- | --- |
|         |     |     |     |     |     |     |     | some questions,                           | or  | may | not belong | to  | any category. |     |
| HOWTO:  |     |     |     |     |     |     |     | Forexample,somedocumentsinourKBarerelated |     |     |            |     |               |     |
UseSpeechRecognitioninWindowsXP
withmultipleversionsofMS-Office,butothersmay
Theinformationinthisarticleappliesto:
|     |     |     |     |     |     |     |     | be irrelevant | to any | of them. | Moreover, |     | the | match- |
| --- | --- | --- | --- | --- | --- | --- | --- | ------------- | ------ | -------- | --------- | --- | --- | ------ |
ingscoreoftheretrieveddocumentsshouldbetaken
• MicrosoftWindowsXPProfessional
|     |     |     |     |     |     |     |     | intoaccountinthiscomputation. |     |     |     | Therefore, |     | wede- |
| --- | --- | --- | --- | --- | --- | --- | --- | ----------------------------- | --- | --- | --- | ---------- | --- | ----- |
•
MicrosoftWindowsXPHomeEdition fineIGH(S)foracandidatequestionS
bythefol-
lowingequations.
| Summary: |     | This | article | describes | how | to use | speech |     |     |     |     |     |     |     |
| -------- | --- | ---- | ------- | --------- | --- | ------ | ------ | --- | --- | --- | --- | --- | --- | --- |
recognitioninWindowsXP.Ifyouinstalledspeech
(cid:1)n
recognitionwithMicrosoftOfficeXP,orifyoupur-
|     |                                             |         |        |             |     |            |      |     | H(S) | −   | P(i)·logP(i) |     |     |     |
| --- | ------------------------------------------- | ------- | ------ | ----------- | --- | ---------- | ---- | --- | ---- | --- | ------------ | --- | --- | --- |
|     | chasedanewcomputerthathasOfficeXPinstalled, |         |        |             |     |            |      |     | =    |     |              |     |     |     |
|     | you                                         | can use | speech | recognition | in  | all Office | pro- |     |      | i=0 |              |     |     |     |
gramsaswellasotherprogramsforwhichitisen-
|     | abled. |     |     |     |     |     |     |     |     |     | |C | |     |     |     |
| --- | ------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---- | --- | --- | --- |
i
|                    |         |        |                                |         |        |          |         |     | P(i) | =   | (cid:2) |     |     |     |
| ------------------ | ------- | ------ | ------------------------------ | ------- | ------ | -------- | ------- | --- | ---- | --- | ------- | --- | --- | --- |
| Detailinformation: |         |        | Speechrecognitionenablestheop- |         |        |          |         |     |      |     | n |C    | |   |     |     |
|                    |         |        |                                |         |        |          |         |     |      |     | i=0     | i   |     |     |
|                    | erating | system | to                             | convert | spoken | words to | written |     |      |     |         |     |     |     |
(cid:1)
|     | text. | Aninternaldriver,calledaspeechrecognition |     |     |     |     |     |     |      |     |      |     |     |     |
| --- | ----- | ----------------------------------------- | --- | --- | --- | --- | --- | --- | ---- | --- | ---- | --- | --- | --- |
|     |       |                                           |     |     |     |     |     |     | |C i | | = | CM(D | k)  |     |     |
engine,recognizeswordsandconvertsthemtotext.
|         | Thespeechrecognitionengine... |     |     |     |     |     |     |         |                                   | D k | ∈i  |     |     |     |
| ------- | ----------------------------- | --- | --- | --- | --- | --- | --- | ------- | --------------------------------- | --- | --- | --- | --- | --- |
| (cid:3) |                               |     |     |     |     |     |     | (cid:4) |                                   |     |     |     |     |     |
|         |                               |     |     |     |     |     |     | Here, D | denotesthek-thretrieveddocumentby |     |     |     |     |     |
k
matchingthequerytotheKB,andCM(D)denotes
|     | Figure2: | Exampleofsoftwaresupportarticle |     |     |     |     |     |              |       |             |     |          |     |        |
| --- | -------- | ------------------------------- | --- | --- | --- | --- | --- | ------------ | ----- | ----------- | --- | -------- | --- | ------ |
|     |          |                                 |     |     |     |     |     | the matching | score | of document |     | D. Thus, |     | C rep- |
i
resentsthenumberofdocumentsclassifiedintocat-
|     |     |     |     |     |     |     |     | i   |     |     | S,  |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
search engines. Since the user has to read detail egory by candidate question which is weighted
information of the retrieved documents by clicking withthematchingscore. Thedocumentsthatarenot
relatedtoanycategoryareclassifiedascategory0.
| their | icons | one | by one, | the | number | of items | in the |     |     |     |     |     |     |     |
| ----- | ----- | --- | ------- | --- | ------ | -------- | ------ | --- | --- | --- | --- | --- | --- | --- |
finalresultisrestrictedtoabout15. The system flow incorporating this strategy is
In this work, we adopt Dialog Navigator as a summarizedbelowandalsoshowninFigure3.
back-endsystemandconstructaspokendialoguein-
|     |     |     |     |     |     |     |     | 1. Foraquerysentence,retrievefromKB. |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | ------------------------------------ | --- | --- | --- | --- | --- | --- |
terface.
|     |     |     |     |     |     |     |     | 2. Calculate | IG  | for all | possible | candidate |     | ques- |
| --- | --- | --- | --- | --- | --- | --- | --- | ------------ | --- | ------- | -------- | --------- | --- | ----- |
3 Dialoguestrategytoclarifyuser’svague
tionswhichsatisfyprecondition.
queries
|     |     |     |     |     |     |     |     | 3. Select | the question |     | with the | largest | IG  | (larger |
| --- | --- | --- | --- | --- | --- | --- | --- | --------- | ------------ | --- | -------- | ------- | --- | ------- |
3.1 Dialoguestrategybasedoninformation
|     |     |     |     |     |     |     |     | than | a threshold), |     | and ask | the question |     | to the |
| --- | --- | --- | --- | --- | --- | --- | --- | ---- | ------------- | --- | ------- | ------------ | --- | ------ |
gain(IG)
|     |     |     |     |     |     |     |     | user. | Otherwise,outputthecurrentretrievalre- |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | ----- | -------------------------------------- | --- | --- | --- | --- | --- |
sult.
| In  | the proposed |     | clarification |     | dialogue | strategy, | the |     |     |     |     |     |     |     |
| --- | ------------ | --- | ------------- | --- | -------- | --------- | --- | --- | --- | --- | --- | --- | --- | --- |
systemasksoptimalquestionstoconstrainthegiven
|           |     |         |     |            |      |              |     | 4. Update | the query | sentence |     | using | the user’s | re- |
| --------- | --- | ------- | --- | ---------- | ---- | ------------ | --- | --------- | --------- | -------- | --- | ----- | ---------- | --- |
| retrieval |     | results | and | help users | find | the intended |     |           |           |          |     |       |            |     |
plytothequestion.
| ones.   | Questions |               | are | dynamically | generated   |      | by se-    |               |     |     |     |     |     |     |
| ------- | --------- | ------------- | --- | ----------- | ----------- | ---- | --------- | ------------- | --- | --- | --- | --- | --- | --- |
| lecting | from      | a pool        | of  | possible    | candidates  |      | that sat- | 5. Returnto1. |     |     |     |     |     |     |
| isfy    | the       | precondition. |     | The         | information | gain | (IG)      |               |     |     |     |     |     |     |
is defined as a criterion for the selection. The IG This procedure is explained in detail in the fol-
| represents |            | a reduction |             | of entropy, | or         | how many      | re- | lowingsections.                        |     |     |     |     |     |     |
| ---------- | ---------- | ----------- | ----------- | ----------- | ---------- | ------------- | --- | -------------------------------------- | --- | --- | --- | --- | --- | --- |
| trieved    | documents  |             | can         | be          | eliminated | by incorpo-   |     |                                        |     |     |     |     |     |     |
|            |            |             |             |             |            |               |     | 3.2 Questiongenerationbasedonbottom-up |     |     |     |     |     |     |
| rating     | additional |             | information |             | (a reply   | to a question |     |                                        |     |     |     |     |     |     |
andtop-downknowledgesources
| in  | this case). | Its | computation |     | is straightforward |     | if  |     |     |     |     |     |     |     |
| --- | ----------- | --- | ----------- | --- | ------------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- |
the question classifies the document set in a com- Weprepareapoolofquestionsusingthreemethods
pletely disjointed manner. However, the retrieved based on bottom-up knowledge together with top-
documentsmaybelongtotwoormorecategoriesfor downknowledgeofKB.Forabottom-upknowledge
1005

|     |     |     |     |     | System |     |     |     |     | User |     |     |
| --- | --- | --- | --- | --- | ------ | --- | --- | --- | --- | ---- | --- | --- |
Matching with
Knowledge base
knowledge base (KB)
(KB)
Retrieval result
Any question
|     |     |     | Question pool |     |     | with large IG? |     |     |     |     |     |     |
| --- | --- | --- | ------------- | --- | --- | -------------- | --- | --- | --- | --- | --- | --- |
NO
YES
Question
|     |     |     | Update  |     |     | Select question with  |     |     |     |     |     |     |
| --- | --- | --- | ------- | --- | --- | --------------------- | --- | --- | --- | --- | --- | --- |
largest IG for clarification
|     |     |     | query sentence |          |                              |     |     |     | Reply |     |     |     |
| --- | --- | --- | -------------- | -------- | ---------------------------- | --- | --- | --- | ----- | --- | --- | --- |
|     |     |     |                | Figure3: | Overviewofqueryclarification |     |     |     |       |     |     |     |
Table2: Examplesofcandidatequestions(Dependencystructureanalysis: method1)
Ratioof
|     |     | Question |     |     |     | Precondition |     |     |     |     | IG  |     |
| --- | --- | -------- | --- | --- | --- | ------------ | --- | --- | --- | --- | --- | --- |
applicabledoc.
|     | Whatdidyoudelete? |     |     | Querysentenceincludes“delete” |     |     |     |     | 2.15(%) |     | 7.44 |     |
| --- | ----------------- | --- | --- | ----------------------------- | --- | --- | --- | --- | ------- | --- | ---- | --- |
Whatdidyouinstall? Querysentenceincludes“install” 3.17(%) 6.00
|     | Whatdidyouinsert?  |     |     |     | Querysentenceincludes“insert” |     |     |     | 1.12(%) |     | 7.12 |     |
| --- | ------------------ | --- | --- | --- | ----------------------------- | --- | --- | --- | ------- | --- | ---- | --- |
|     | Whatdidyousave?    |     |     |     | Querysentenceincludes“save”   |     |     |     | 1.81(%) |     | 6.89 |     |
|     | Whatisthefiletype? |     |     |     | Querysentenceincludes“file”   |     |     |     | 0.94(%) |     | 6.00 |     |
|     | Whatdidyousetup?   |     |     |     | Querysentenceincludes“setup”  |     |     |     | 0.69(%) |     | 6.45 |     |
source, we conducted a dependency structure anal- confirmed by calculating entropy for modifier-head
ysis on KB. As for top-down knowledge, we make pairs from the text corpus. The procedure is as fol-
| use of metadata |     | included | in KB | and | human | knowl- | lows. |     |     |     |     |     |
| --------------- | --- | -------- | ----- | --- | ----- | ------ | ----- | --- | --- | --- | --- | --- |
edge.
1. Extractallmodifier-headpairsfromthetextof
|     |     |     |     |     |     |     | KB and | query | sentences | (typed |     | input) to an- |
| --- | --- | --- | --- | --- | --- | --- | ------ | ----- | --------- | ------ | --- | ------------- |
3.2.1 Questionsbasedondependencystructure
|     |     |     |     |     |     |     | other | retrieval | system1 | provided |     | by Microsoft |
| --- | --- | --- | --- | --- | --- | --- | ----- | --------- | ------- | -------- | --- | ------------ |
analysis(method1)
Japan.
| This | type of | question | is intended |     | to clarify | the |     |     |     |     |     |     |
| ---- | ------- | -------- | ----------- | --- | ---------- | --- | --- | --- | --- | --- | --- | --- |
H(m)
|              |           |           |               |           |          |         | 2. Calculate   | entropy    |          | for    | every | word based    |
| ------------ | --------- | --------- | ------------- | --------- | -------- | ------- | -------------- | ---------- | -------- | ------ | ----- | ------------- |
| modifier     | or object | of        | some          | words,    | based    | on de-  |                |            |          |        |       |               |
|              |           |           |               |           |          |         | on probability |            | P(i).    | This   | P(i)  | is calculated |
| pendency     | structure | analysis, |               | when they | are      | uncer-  |                |            |          |        |       |               |
|              |           |           |               |           |          |         | with the       | occurrence |          | count  | N(m)  | of word m     |
| tain. For    | instance, | the       | verb “delete” |           | can have | var-    |                |            |          |        |       |               |
|              |           |           |               |           |          |         | that appears   | in         | the text | corpus | and   | the count     |
| ious objects | such      | as        | “application  | program”  |          | or “ad- |                |            |          |        |       |               |
N(i,m)ofwordmwhosemodifierisi.
| dressbook”. | Therefore,thequerycanbeclarifiedby |         |         |              |     |      |     |     |     |     |     |     |
| ----------- | ---------------------------------- | ------- | ------- | ------------ | --- | ---- | --- | --- | --- | --- | --- | --- |
| identifying | such                               | objects | if they | are missing. |     | How- |     |     |     |     |     |     |
(cid:1)
ever,notallwordsneedtobeconfirmedbecausethe
|     |     |     |     |     |     |     | H(m) | =   | −   | P(i)∗logP(i) |     |     |
| --- | --- | --- | --- | --- | --- | --- | ---- | --- | --- | ------------ | --- | --- |
modifierorobjectcanbeidentifiedalmostuniquely
i
| for some | words. | For | instance, | the | object | of the |     |     |     |     |     |     |
| -------- | ------ | --- | --------- | --- | ------ | ------ | --- | --- | --- | --- | --- | --- |
N(i,m)
word“shutdown”is“computer”inmostcasesinthis
P(i) =
N(m)
| task domain. |     | It is tedious | to  | identify | the object | of  |     |     |     |     |     |     |
| ------------ | --- | ------------- | --- | -------- | ---------- | --- | --- | --- | --- | --- | --- | --- |
suchwords. Wethereforedeterminethewordstobe 1http://www.microsoft.com/japan/enable/nlsearch/
1006

|     |     |     | Table3: Examplesofcandidatequestions(Metadata: |     |     |     |     | method2) |     |     |     |     |
| --- | --- | --- | ---------------------------------------------- | --- | --- | --- | --- | -------- | --- | --- | --- | --- |
Ratioof
|     |     | Question |     |     |     | Precondition |     |     |     |     | IG  |     |
| --- | --- | -------- | --- | --- | --- | ------------ | --- | --- | --- | --- | --- | --- |
applicabledoc.
Whatistheversion
|     |     |     |     |     |     | None |     |     | 30.03(%) |     | 2.63 |     |
| --- | --- | --- | --- | --- | --- | ---- | --- | --- | -------- | --- | ---- | --- |
ofyourWindows?
|     | Whatisyourapplication? |     |     |     |     | None |     |     | 30.28(%) |     | 2.31 |     |
| --- | ---------------------- | --- | --- | --- | --- | ---- | --- | --- | -------- | --- | ---- | --- |
Whatistheversion
|     |     |     |     | Querysentenceincludes“Word” |     |     |     |     | 3.76(%) |     | 2.71 |     |
| --- | --- | --- | --- | --------------------------- | --- | --- | --- | --- | ------- | --- | ---- | --- |
ofyourWord?
Whatistheversion
|     |     |     |     | Querysentenceincludes“Excel” |     |     |     |     | 4.13(%) |     | 2.44 |     |
| --- | --- | --- | --- | ---------------------------- | --- | --- | --- | --- | ------- | --- | ---- | --- |
ofyourExcel?
|     |     | Table4: | Listofcandidatequestions(Humanknowledge: |     |     |     |     | method3) |     |     |     |     |
| --- | --- | ------- | ---------------------------------------- | --- | --- | --- | --- | -------- | --- | --- | --- | --- |
Ratioof
|     |     | Question |     |     |     | Precondition |     |     |     |     | IG  |     |
| --- | --- | -------- | --- | --- | --- | ------------ | --- | --- | --- | --- | --- | --- |
applicabledoc.
|     | Whendidthesymptomoccur? |     |     |     |     | None |     |     | 15.40(%) |     | 8.08 |     |
| --- | ----------------------- | --- | --- | --- | --- | ---- | --- | --- | -------- | --- | ---- | --- |
Tellmetheerrormessage. Querysentenceincludes“error” 2.63(%) 8.61
Whatdoyouconcretely
|     |     |     |     |     |     | None |     |     | 6.98(%) |     | 8.04 |     |
| --- | --- | --- | --- | --- | --- | ---- | --- | --- | ------- | --- | ---- | --- |
wanttodo?
As a result, we selected 40 words that have a large pendsonthecharacteristicsofthemetadata.
valueofentropy. Questionsentencesforthesewords Fourteen candidate questions are prepared using
were generated with a template of “What did you this method. Example of candidate questions are
...?” and unnatural ones were corrected manually. listedinTable3. Ratioofapplicabledocumentcor-
CategoriesforIGcalculation aredefinedbyobjects responds to the ratio of documents that have meta-
ofthesewordsincludedinmatcheddocuments. The dataoftargetproducts.
| system | can make  | question | using this    | method | when |                                      |     |     |     |     |     |     |
| ------ | --------- | -------- | ------------- | ------ | ---- | ------------------------------------ | --- | --- | --- | --- | --- | --- |
|        |           |          |               |        |      | 3.2.3 Questionsbasedonhumanknowledge |     |     |     |     |     |     |
| these  | words are | included | in the user’s | query. |      | Ta-                                  |     |     |     |     |     |     |
(method3)
ble2listsexamplesofcandidatequestionsusingthis
|             |         |           |                     |      |          | Software  | support | is       | conventionally |           | provided | by   |
| ----------- | ------- | --------- | ------------------- | ---- | -------- | --------- | ------- | -------- | -------------- | --------- | -------- | ---- |
| method.     | In this | table,    | ratio of applicable |      | document |           |         |          |                |           |          |      |
|             |         |           |                     |      |          | operators | at call | centers. | We             | therefore | prepare  | can- |
| corresponds | to      | the ratio | of documents        | that | include  |           |         |          |                |           |          |      |
thewordsselectedabove,andIGiscalculatedusing didatequestionsbasedonthehumanknowledgethat
|     |     |     |     |     |     | has been | accumulated | there. |     | This time, | three | kinds |
| --- | --- | --- | --- | --- | --- | -------- | ----------- | ------ | --- | ---------- | ----- | ----- |
applicabledocuments.
|     |     |     |     |     |     | of questions | are | hand-crafted. |     | For | instance, | the |
| --- | --- | --- | --- | --- | --- | ------------ | --- | ------------- | --- | --- | --------- | --- |
3.2.2 Questionsbasedonmetadataincludedin
|     |     |     |     |     |     | question | “When | did the | symptom | occur?” |     | tries to |
| --- | --- | --- | --- | --- | --- | -------- | ----- | ------- | ------- | ------- | --- | -------- |
KB(method2)
|     |     |     |     |     |     | capture | key information |     | to identify |     | relevant | docu- |
| --- | --- | --- | --- | --- | --- | ------- | --------------- | --- | ----------- | --- | -------- | ----- |
We also prepare candidate questions using the ments. ThecategoriesforIGcaluclationaredefined
metadata attached to the KB. In general large-scale usinghand-craftedrulesbyfocusingonkey-phrases
KBs, metadata is usually attached to manage them such as “after ...” or “during ...”. Candidate ques-
efficiently. Forexample,categoryinformationisat- tionsarelistedinTable4.
tached to newspaper articles and books in libraries. Anexampledialoguewherethesystemasksques-
In our target KB, a number of documents include tionsbasedonIGisinFigure4.
| metadata | of product |     | names to which | the | document |                                    |     |     |     |     |     |     |
| -------- | ---------- | --- | -------------- | --- | -------- | ---------------------------------- | --- | --- | --- | --- | --- | --- |
|          |            |     |                |     |          | 3.3 Updateofretrievalquerysentence |     |     |     |     |     |     |
applies. Thesystemcangeneratequestiontowhich
the user’s query corresponds using this metadata. Through the dialogue to clarify the user’s query,
However,somedocumentsarerelatedwithmultiple the system updates the query sentence using the
versions,ormaynotbelongtoanycategory. There- user’s reply to the question. Our backend informa-
fore, the performance of these questionsgreatly de- tion retrieval system does not adopt simple “bag-
1007

|     |     | S1:                 |     |     | Whatisyourproblem? |                                         |             |                 |     |          |         |     |
| --- | --- | ------------------- | --- | --- | ------------------ | --------------------------------------- | ----------- | --------------- | --- | -------- | ------- | --- |
|     |     | U1:                 |     |     | Toogarbledtoread.  |                                         |             |                 |     |          |         |     |
|     |     | (Retrievalresults): |     |     | (cid:1)            |                                         |             |                 |     |          | (cid:2) |     |
|     |     |                     |     |     | 1.                 | Closebuttonandmaximizebuttonaregarbled. |             |                 |     |          |         |     |
|     |     |                     |     |     | 2.                 | CharactersaregarbledinOutlookToday.     |             |                 |     |          |         |     |
|     |     |                     |     |     | 3.                 | Characters                              | are garbled | while inserting |     | Japanese |         |     |
text.
|     |     |     |     |     | 4.  | VBapplicationisgarbledtoread. |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | ----------------------------- | --- | --- | --- | --- | --- | --- |
···
|     |     |     |     |     | (cid:3) |     |     |     |     |     | (cid:4) |     |
| --- | --- | --- | --- | --- | ------- | --- | --- | --- | --- | --- | ------- | --- |
(CalculateIG)
·Candidatequestion1:
|     |     |     |     |     | Whatisgarbledtoread? |     |     | –IG5.27 |     |     |     |     |
| --- | --- | --- | --- | --- | -------------------- | --- | --- | ------- | --- | --- | --- | --- |
·Candidatequestion2:
–IG1.43
WhatistheversionofyourWindows?
·Candidatequestion3:
–IG2.47
Whendidthesymptomoccur?
···
|     |     | S2: |     |     | (SelectquestionwithlargestIG) |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | ----------------------------- | --- | --- | --- | --- | --- | --- | --- |
Whatisgarbledtoread?
|     |     | U2: |     |     | Charactersonwindowbutton. |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | ------------------------- | --- | --- | --- | --- | --- | --- | --- |
|     |     | S3: |     |     | (Updatequerysentence)     |     |     |     |     |     |     |     |
Retrievingwith“Charactersonwindowbuttonaretoogarbled
toread”.
|     |     |     |     |     | Figure4: | Exampledialogue |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | -------- | --------------- | --- | --- | --- | --- | --- | --- |
of-words” model, but conducts a more precise de- “Tell me the error message.” is inserted right
pendency structure analysis for matching; therefore aftertheword“error”inthequerysentence.
| forming                         | an appropriate |     | query | sentence | is desirable  |     |     |     |     |     |     |     |
| ------------------------------- | -------------- | --- | ----- | -------- | ------------- | --- | --- | --- | --- | --- | --- | --- |
| ratherthansimplyaddingkeywords. |                |     |       |          | Moreover,itis |     |     |     |     |     |     |     |
Adialogueexamplewherethesystemupdatesthe
| more comprehensible |          | to   | the user | to   | present      | the up- |              |     |       |           |           |       |
| ------------------- | -------- | ---- | -------- | ---- | ------------ | ------- | ------------ | --- | ----- | --------- | --------- | ----- |
|                     |          |      |          |      |              |         | user’s query | is  | shown | in Figure | 5. In the | exam- |
| dated query         | sentence | than | to       | show | the sequence | of      |              |     |       |           |           |       |
ple,thesystemmakesconfirmation“Retrievingwith
| ASRresults. | Here,theupdaterulesofthequerysen- |     |     |     |     |     |     |     |     |     |     |     |
| ----------- | --------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
‘WhenItrytoopenitinexplorer,IcannotopenEx-
tencearepreparedasfollows.
cel2002file’”attheendofthedialoguebeforepre-
sentingtheactualretrievalresult.
1. Questionsbasedondependencystructureanal-
ysis
|       |           |           |         |             |                 |        | 3.4 Experimentalevaluation                  |     |     |           |     |          |
| ----- | --------- | --------- | ------- | ----------- | --------------- | ------ | ------------------------------------------- | --- | --- | --------- | --- | -------- |
| The   | user’s    | reply is  | added   | immediately |                 | before |                                             |     |     |           |     |          |
|       |           |           |         |             |                 |        | We implemented                              |     | and | evaluated | the | proposed |
| of    | after the | word      | that is | the reply’s | modifying       |        |                                             |     |     |           |     |          |
|       |           |           |         |             |                 |        | method. Wecollectedatestdataby14subjectswho |     |     |           |     |          |
| head. | For       | instance, | the     | reply       | to the question |        |                                             |     |     |           |     |          |
“What did you delete?” is inserted right after hadnotusedoursystemEachsubjectwasrequested
theword“delete”inthequerysentence. to retrieve support articles for 14 tasks, which con-
|     |     |     |     |     |     |     | sisted of | prepared | scenarios |     | (query sentences | were |
| --- | --- | --- | --- | --- | --- | --- | --------- | -------- | --------- | --- | ---------------- | ---- |
2. QuestionsbasedonmetadataofKB not given). The subjects were allowed to utter a
|     |     | {Product | name} | {version |     | name}” |     |     |     |     |     |     |
| --- | --- | -------- | ----- | -------- | --- | ------ | --- | --- | --- | --- | --- | --- |
Phrases “In query again up to twice per task if they thought an
|     |     |     |     |     |     |     | adequate | retrieval | result | was | not obtained. | As a re- |
| --- | --- | --- | --- | --- | --- | --- | -------- | --------- | ------ | --- | ------------- | -------- |
areaddedtothequerysentence.
sult,wecollected238utterancesfor196(=14×14)
3. Questionsbasedonhumanknowledge tasks in total. An example of scenario and user ut-
The position where the user’s reply is inserted terances are shown in Figure 6. The average word
is specified beforehand for each question can- accuracyofASRwas82.9%. Thethresholdvaluein
didate. For instance, the reply to the question IGthatthesystemmakesaquestionissetto1.0ini-
1008

|     |     | S1:                    |     | Whatisyourproblem?                                |     |     |     |     |     |     |     |     |
| --- | --- | ---------------------- | --- | ------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- |
|     |     | U1:                    |     | Icannotopenthefile.                               |     |     |     |     |     |     |     |     |
|     |     | S2:                    |     | Whatisthefiletype?(method1)                       |     |     |     |     |     |     |     |     |
|     |     | U2:                    |     | Excelfile.                                        |     |     |     |     |     |     |     |     |
|     |     | (Updatequerysentence): |     | “IcannotopenExcelfile.”                           |     |     |     |     |     |     |     |     |
|     |     | S3:                    |     | WhatistheversionofyourExcel?(method2)             |     |     |     |     |     |     |     |     |
|     |     | U3:                    |     | MyExcelisversion2002.                             |     |     |     |     |     |     |     |     |
|     |     | (Updatequerysentence): |     | “IcannotopenExcel2002file.”                       |     |     |     |     |     |     |     |     |
|     |     | S4:                    |     | Whendidthesymptomoccur?(method3)                  |     |     |     |     |     |     |     |     |
|     |     | U4:                    |     | Triedtoopenitinexplorer.                          |     |     |     |     |     |     |     |     |
|     |     | S5:                    |     | Retrievingwith“WhenItrytoopenitinexplorer,Icannot |     |     |     |     |     |     |     |     |
openExcel2002file”.
Figure5: Querysentenceupdateusinguser’sreply
| (cid:1) |     |     |     |     |     | (cid:2)     |     |               |     |       |              |     |
| ------- | --- | --- | --- | --- | --- | ----------- | --- | ------------- | --- | ----- | ------------ | --- |
|         |     |     |     |     |     | performance | in  | real dialogue |     | which | is evaluated | by  |
• Anexampleofscenario
|     |         |             |            |          |       | the log  | data. Specifically, |     | the            | users | might | not have    |
| --- | ------- | ----------- | ---------- | -------- | ----- | -------- | ------------------- | --- | -------------- | ----- | ----- | ----------- |
|     | You are | looking for | restaurant | in Kyoto | using |          |                     |     |                |       |       |             |
|     |         |             |            |          |       | answered | the questions       |     | appropriately, |       | or    | the replies |
WWW.Youhavefoundanicerestaurantandtried
toprintoutanimageofthemapshowingtherestau- might not have been correctly recognized. There-
|     | rant. However,itisnotprintedout. |     |     | (Yourbrowser |     |     |     |     |     |     |     |     |
| --- | -------------------------------- | --- | --- | ------------ | --- | --- | --- | --- | --- | --- | --- | --- |
fore,wealsoevaluatedwiththefollowingcondition.
isIE6.0)
• Examplesofusers’utterance
|     |     |     |     |     |     | 4. Proposed |     | method | (simulation): |     | The | system |
| --- | --- | --- | --- | --- | --- | ----------- | --- | ------ | ------------- | --- | --- | ------ |
– Iwanttoprintanimageofmap. generated questions based on the proposed
|     | – Ican’tprintout.                       |     |     |     |     | method,   |     | and appropriate |     | answers |     | were given |
| --- | --------------------------------------- | --- | --- | --- | --- | --------- | --- | --------------- | --- | ------- | --- | ---------- |
|     | – Ifailedtoprintapictureinhomepageusing |     |     |     |     | manually. |     |                 |     |         |     |            |
IE.
– Pleasetellmehowtoprintoutanimage. Table5liststheretrievalsuccessrateandtherankof
thecorrectdocumentintheretrievalresult,bythese
| (cid:3) |     |     |     |     |     | (cid:4)    |          |     |        |          |     |             |
| ------- | --- | --- | --- | --- | --- | ---------- | -------- | --- | ------ | -------- | --- | ----------- |
|         |     |     |     |     |     | cases. The | proposed |     | method | achieved | a   | better suc- |
Figure6: Exampleofscenarioanduserutterances cess rate than when the ASR result was used. An
|     |     |     |     |     |     | improvement | of  | 12.6%   | was | achieved  | in    | the simula- |
| --- | --- | --- | --- | --- | --- | ----------- | --- | ------- | --- | --------- | ----- | ----------- |
|     |     |     |     |     |     | tion case,  | and | 7.7% by | the | log data. | These | figures     |
tially,andincrementedby0.3everytimethesystem demonstrate the effectiveness of the proposed ap-
generatesaquestionthroughadialoguesession.
|     |     |     |     |     |     | proach. | The success |     | rate of | the retrieval |     | was about |
| --- | --- | --- | --- | --- | --- | ------- | ----------- | --- | ------- | ------------- | --- | --------- |
First, we evaluated the success rate of retrieval. 5% higher in the simulation case than the log data.
We regarded a retrieval as successful when the re- Thisdifferenceisconsideredtobecausedbyfollow-
| trievalresultcontainedacorrectdocumententryfor |     |                              |     |     |     | ingfactors.                        |     |     |     |     |     |     |
| ---------------------------------------------- | --- | ---------------------------- | --- | --- | --- | ---------------------------------- | --- | --- | --- | --- | --- | --- |
| thescenario.                                   |     | Wecomparedthefollowingcases. |     |     |     |                                    |     |     |     |     |     |     |
|                                                |     |                              |     |     |     | 1. ASRerrorsinuser’sutteredreplies |     |     |     |     |     |     |
1. Transcript: A correct transcript of the user ut- In the proposed strategy, the retrieval sentence
terance, prepared manually, was used as an in- isupdatedusingtheuser’sreplytothequestion
| put.   |        |             |     |            |     | regardless |          | of ASR | errors.        | Even   | when       | the user |
| ------ | ------ | ----------- | --- | ---------- | --- | ---------- | -------- | ------ | -------------- | ------ | ---------- | -------- |
|        |        |             |     |            |     | notices    | the      | ASR    | errors,        | he/she | cannot     | correct  |
| 2. ASR | result | (baseline): | The | ASR result | was |            |          |        |                |        |            |          |
|        |        |             |     |            |     | them.      | Although |        | it is possible |        | to confirm | them     |
usedasaninput.
|     |     |     |     |     |     | using | ASR | confidence |     | measures, | it  | makes di- |
| --- | --- | --- | --- | --- | --- | ----- | --- | ---------- | --- | --------- | --- | --------- |
3. Proposedmethod(logdata): Thesystemgener- alogue more complicated. Hence, it was not
ated questions based on the proposed method, implementedthistime.
| and | the user | replied | to them | as he/she | thought |           |                  |     |     |        |          |       |
| --- | -------- | ------- | ------- | --------- | ------- | --------- | ---------------- | --- | --- | ------ | -------- | ----- |
|     |          |         |         |           |         | 2. User’s | misunderstanding |     |     | of the | system’s | ques- |
appropriate.
tions
We alsoevaluated theproposedmethod bysimu- Users sometimes misunderstood the system’s
lation in order to confirm its theoretical effect. Var- questions. Forinstance,tothesystemquestion
iousfactorsoftheentiresystemmightinfluencethe “When did the symptom occur?”, some user
1009

|       |     |              |     |         |         |         | optimal | question | based | on  | information |     | gain (IG). |
| ----- | --- | ------------ | --- | ------- | ------- | ------- | ------- | -------- | ----- | --- | ----------- | --- | ---------- |
| Table | 5:  | Success rate | and | average | rank of | correct |         |          |       |     |             |     |            |
Then,thequerysentenceisupdatedusingtheuser’s
documentinretrieval
|     |     |     |     |         |        |     | reply. An | experimental |     | evaluation |     | showed | that the |
| --- | --- | --- | --- | ------- | ------ | --- | --------- | ------------ | --- | ---------- | --- | ------ | -------- |
|     |     |     |     | Success | Rankof |     |           |              |     |            |     |        |          |
rate correctdoc. proposedmethodsignificantlyimprovedthesuccess
|     |            |     |     |       |      |     | rate of | retrieval, | and | all categories |     | of the | prepared |
| --- | ---------- | --- | --- | ----- | ---- | --- | ------- | ---------- | --- | -------------- | --- | ------ | -------- |
|     | Transcript |     |     | 76.1% | 7.20 |     |         |            |     |                |     |        |          |
questionscontributedtotheimprovement.
| ASRresult(baseline) |     |     |     | 70.7% | 7.45 |     |              |     |          |     |             |     |            |
| ------------------- | --- | --- | --- | ----- | ---- | --- | ------------ | --- | -------- | --- | ----------- | --- | ---------- |
|                     |     |     |     |       |      |     | The proposed |     | approach |     | is intended | for | restricted |
Proposedmethod
|     |     |     |     | 78.4% | 4.40 |     | domains, | where | all | KB  | documents | and | several |
| --- | --- | --- | --- | ----- | ---- | --- | -------- | ----- | --- | --- | --------- | --- | ------- |
(logdata)
|     |     |     |     |     |     |     | knowledge | sources |     | are available, | and | it  | is not ap- |
| --- | --- | --- | --- | --- | --- | --- | --------- | ------- | --- | -------------- | --- | --- | ---------- |
Proposedmethod
|     |     |     |     | 83.3% | 3.85 |     |     |     |     |     |     |     |     |
| --- | --- | --- | --- | ----- | ---- | --- | --- | --- | --- | --- | --- | --- | --- |
(simulation) plicable to open-domain information retrieval such
|     |     |     |     |     |     |     | as Web | search. | We  | believe, | however, | that | there are |
| --- | --- | --- | --- | --- | --- | --- | ------ | ------- | --- | -------- | -------- | ---- | --------- |
Table6: Comparisonofquestionmethods many targets of information retrieval in restricted
|     |     |     |         |     |            |     | domains, | for | example, | manuals | of  | electric | appli- |
| --- | --- | --- | ------- | --- | ---------- | --- | -------- | --- | -------- | ------- | --- | -------- | ------ |
|     |     |     | Success |     | #generated |     |          |     |          |         |     |          |        |
rate questions ances and medical documents for expert systems.
|     |     |     |     |     | (perdialogue) |     | Themethodologyproposedhereisnotsodependent |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | ------------- | --- | ------------------------------------------ | --- | --- | --- | --- | --- | --- |
ASRresult(baseline) 70.7% — onthedomains,thusapplicabletomanyothertasks
| Dependencystructure |     |     |     |       |      |     | ofthiscategory. |     |     |     |     |     |     |
| ------------------- | --- | --- | --- | ----- | ---- | --- | --------------- | --- | --- | --- | --- | --- | --- |
|                     |     |     |     | 74.5% | 0.38 |     |                 |     |     |     |     |     |     |
analysis(method1)
|                   |     |     |     |       |      |     | 5 Acknowledgements |     |     |     |     |     |     |
| ----------------- | --- | --- | --- | ----- | ---- | --- | ------------------ | --- | --- | --- | --- | --- | --- |
| Metadata(method2) |     |     |     | 75.7% | 0.89 |     |                    |     |     |     |     |     |     |
Humanknowledge The authors are grateful to Prof. Kurohashi and Dr.
|     |     |     |     | 74.5% | 0.97 |     |     |     |     |     |     |     |     |
| --- | --- | --- | --- | ----- | ---- | --- | --- | --- | --- | --- | --- | --- | --- |
(method3)
|     |     |     |     |     |     |     | Kiyota | at University |     | of Tokyo | and | Dr. Komatani | at  |
| --- | --- | --- | --- | --- | --- | --- | ------ | ------------- | --- | -------- | --- | ------------ | --- |
Allmethods
|     |     |     |     | 83.3% | 2.24 |     |     |     |     |     |     |     |     |
| --- | --- | --- | --- | ----- | ---- | --- | --- | --- | --- | --- | --- | --- | --- |
KyotoUniversityfortheirhelpfuladvice.
(method1-3)
repliedsimply“justnow”insteadofkeyinfor-
References
|     | mationfortheretrieval. |     |     | Tothisproblem,itmay |     |     |     |     |     |     |     |     |     |
| --- | ---------------------- | --- | --- | ------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
E.Chang,F.Seide,H.M.Meng,Z.Chen,Y.Shi,andY.C.Li.
be necessary to make more specific questions 2002. A system for spoken query information retrieval on
|     |     |     |     |     |     |     | mobiledevices. |     | IEEETrans.onSpeechandAudioProcess- |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | -------------- | --- | ---------------------------------- | --- | --- | --- | --- |
ortodisplayreplyexamples.
ing,10(8):531–541.
Wealsoevaluatedtheefficiencyoftheindividual
|          |          |                                      |            |     |             |     | M. Denecke | and | A. Waibel.          | 1997. | Dialogue | strategies | guid-     |
| -------- | -------- | ------------------------------------ | ---------- | --- | ----------- | --- | ---------- | --- | ------------------- | ----- | -------- | ---------- | --------- |
| methods. |          | Inthisexperiment,eachofthethreemeth- |            |     |             |     |            |     |                     |       |          |            |           |
|          |          |                                      |            |     |             |     | ing users  | to  | their communicative |       | goals.   | In         | Proc. EU- |
| ods      | was used | to generate                          | questions. |     | The results | are | ROSPEECH.  |     |                     |       |          |            |           |
inTable6. Theimprovementratebythethreemeth- A. Fujii and K. Itou. 2003. Building a test collection for
|     |         |             |       |     |                  |     | speech-drivenWebretrieval. |     |     |     | InProc.EUROSPEECH. |     |     |
| --- | ------- | ----------- | ----- | --- | ---------------- | --- | -------------------------- | --- | --- | --- | ------------------ | --- | --- |
| ods | did not | differ very | much, | and | most significant |     |                            |     |     |     |                    |     |     |
improvementwasobtainedbyusingthethreemeth-
C.Hori,T.Hori,H.Isozaki,E.Maeda,S.Katagiri,andS.Furui.
ods together. While the questions based on human 2003. Derivingdisambiguousqueriesinaspokeninteractive
|           |     |            |         |     |           |      | ODQAsystem. |     | InProc.IEEE-ICASSP. |     |     |     |     |
| --------- | --- | ---------- | ------- | --- | --------- | ---- | ----------- | --- | ------------------- | --- | --- | --- | --- |
| knowledge |     | are rather | general | and | were used | more |             |     |                     |     |     |     |     |
often, the questions based on the dependency struc- Y. Kiyota, S. Kurohashi, and F. Kido. 2002. ”Dialog Nav-
|                 |          |                              |     |          |      |           | igator”:       | A question |                             | answering | system | based on | large text |
| --------------- | -------- | ---------------------------- | --- | -------- | ---- | --------- | -------------- | ---------- | --------------------------- | --------- | ------ | -------- | ---------- |
| ture            | analysis | are specific,                |     | and thus | more | effective |                |            |                             |           |        |          |            |
|                 |          |                              |     |          |      |           | knowledgebase. |            | InProc.COLING,pages460–466. |           |        |          |            |
| whenapplicable. |          | Hence,thequestionsbasedonthe |     |          |      |           |                |            |                             |           |        |          |            |
E.Levin,S.Narayanan,R.Pieraccini,K.Biatov,E.Bocchieri,
dependency structure analysis (method 1) obtained G.DiFabbrizio,W.Eckert,S.Lee,A.Pokrovsky,M.Rahim,
arelativelyhighimprovementrateperquestion. P.Ruscitti,andM.Walker. 2000. TheAT&T-DARPACom-
|     |     |     |     |     |     |     | municatormixed-initiativespokendialoguesystem. |     |     |     |     |     | InProc. |
| --- | --- | --- | --- | --- | --- | --- | ---------------------------------------------- | --- | --- | --- | --- | --- | ------- |
ICSLP.
4 Conclusion
|           |          |              |           |          |                |       | NISTandDARPA.  |        | 2003.    | ThetwelfthTextREtrievalConfer- |                     |      |            |
| --------- | -------- | ------------ | --------- | -------- | -------------- | ----- | -------------- | ------ | -------- | ------------------------------ | ------------------- | ---- | ---------- |
| We        | proposed | a dialogue   |           | strategy | to clarify     | user’ |                |        |          |                                |                     |      |            |
|           |          |              |           |          |                |       | ence (TREC     | 2003). |          | In NIST                        | Special Publication |      | SP 500–    |
| queries   | for      | document     | retrieval | tasks.   | Candidate      |       | 255.           |        |          |                                |                     |      |            |
| questions |          | are prepared | based     | on       | the dependency |       |                |        |          |                                |                     |      |            |
|           |          |              |           |          |                |       | A. Potamianos, | E.     | Ammicht, | and                            | H.-K. J.            | Kuo. | 2000. Dia- |
structureanalysisoftheKBtogetherwithKBmeta- logue management in the Bell labs Communicator system.
InProc.ICSLP.
| data | and human | knowledge. |     | The system | selects | an  |     |     |     |     |     |     |     |
| ---- | --------- | ---------- | --- | ---------- | ------- | --- | --- | --- | --- | --- | --- | --- | --- |
1010